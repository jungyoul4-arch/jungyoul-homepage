# 마우스 오버(hover) 딜레이 진단 보고서 — v2 (데스크톱 재측정 반영)

- **일시**: 2026-06-09
- **대상**: 라이브 프로덕션 `https://news.jung-youl.com` (홈)
- **방법**:
  - 1차 — 코드 분석(Explore ×2) + iOS 모바일 Playwright MCP 실측
  - **2차 — 데스크톱 Python Playwright(Chromium 1223, 1440×900) + Chrome DevTools Protocol `Performance.getMetrics` + CPU 스로틀(1×/4×/6×)**

## ⚠️ 측정 한계 (정직하게 먼저)
- 데스크톱 측정은 **headless Chromium = 소프트웨어 렌더(SwiftShader)**. **실제 GPU 컴포지팅/레이어·대형 텍스처 jank는 충실히 재현되지 않음.**
- `requestAnimationFrame` 간격 기반 jank 지표는 **headless에서 신뢰 불가**(프레임이 headless 스케줄러로 고정 페이싱 → 항상 ~14ms). 따라서 **"jank 0프레임"은 부드러움의 증거가 아님.**
- 신뢰 가능한 정량 지표는 **CDP 카운터**(`LayoutCount`, `RecalcStyleCount`, `ScriptDuration`)와 **메뉴 열림 시간**뿐 → 본 보고의 결론은 이 카운터에 근거.
- **결론**: 자동화로 *육안 프레임드랍*은 재현하지 못했으나, **비효율 메커니즘 3건을 CDP 카운터로 확정**했고 그중 1건(진행바)은 명백히 재현되는 결함이다. 정밀 육안 확인은 실디바이스/실GPU(DevTools Performance, GPU on) 권장.

---

## TL;DR (v2)
체감 지연의 **가장 유력하고 재현 가능한 상시 원인**은 새로 발견됐다:

1. **[P0·신규·최우선] 히어로 캐러셀 진행바가 `width`를 매 프레임 JS로 갱신** → idle 상태에서도 **초당 ~75회 강제 레이아웃**, **메인스레드 8~14% 상시 점유**(CPU 스로틀에 비례 증가 확인). 페이지가 켜져 있는 내내 메인스레드 헤드룸을 잠식 → **hover를 포함한 모든 상호작용 응답이 쪼들림**. (`hero-carousel.tsx:27, 77-94, 208-209`)
2. **[P0] 히어로 카드 hover가 `top`·`padding`(레이아웃 속성)을 애니메이트** → 300ms 전환 동안 레이아웃 반복. 데스크톱에서 hover 시 +30~37 layout 확정. (`hero-carousel.tsx:421, 553`)
3. **[P0] 히어로 이미지가 1920px(표시폭 대비 6×) 무변형 서빙 + will-change 34개 영구 승격.**

**반증된 가설**: ❌ 메가메뉴 열림(6× 스로틀에서도 32ms) ❌ 최신교육정보 카드 hover(transform 전용, layout 추가 ~0) — **둘 다 지연 원인 아님.**

---

## 2차 데스크톱 측정 데이터 (CDP, 1440×900)

### (A) idle/hover 메인스레드 비용 — CPU 스로틀별
`control` = 무동작 560ms. 값은 해당 구간의 **델타**.

| 구간 | CPU 1× | CPU 4× | CPU 6× |
|---|---|---|---|
| **control** dLayoutCount | 43 | 42 | 42 |
| **control** dScriptMs | 48 | **54** | **78** |
| **hero hover** dLayoutCount | 30~37 | (autoplay 간섭 측정실패) | (실패) |
| **latest hover** dLayoutCount | 33 (≈control, 추가≈0) | 33 | 34 |
| **megamenu 열림** | 10.7ms | 26.3ms | 32.3ms |

- **control이 무동작인데도 매 560ms 42회 layout + script가 스로틀에 비례 증가** → 상시 JS 구동 확정.
- **latest hover는 control 대비 layout 추가가 사실상 0** → transform 전용, 비용 없음(부드러움).
- **megamenu는 6×에서도 32ms** → 지연 아님.

### (B) 상시 비용의 출처 — 단일 요소로 특정
1.2초 idle 동안 geometry/transform/inline-style이 변하는 요소 탐지 → **변경 요소 단 1개**:
```
DIV.h-full bg-gray-900 rounded-full   style="width: 40.28%; transition: none;"   (매 200ms 틱마다 변경)
```
= 히어로 캐러셀 **진행바**. `width %`를 **per-frame JS(`requestAnimationFrame`→`setProgress`)**로 갱신 → React 리렌더 + 인라인 `width` 변경 → **프레임마다 강제 reflow**. (`hero-carousel.tsx:27, 77-94, 208-209`)

### (C) getAnimations
- 실행 중 CSS 애니메이션은 없음 — `card-fade-up`(opacity,transform) 전부 **finished**. → 상시 비용은 CSS가 아니라 (B)의 JS.

### (D) 이미지/레이어 (데스크톱)
- 히어로: dispW 1360, **naturalW 1920(over 6×)**, will-change=transform, hover overlay `transition: top, padding / 0.3s` **확정**.
- 최신교육정보 카드: naturalW 480~640, over 1.46~2.0, **will-change=transform**(데스크톱), layout-anim 없음.
  - ※ 1차(모바일)에서 "최신 그리드 will-change 없음"은 **모바일 반응형 변형 한정** 현상이었고, 데스크톱에선 적용됨(정정).
- `will-change != auto` 요소 **34개**(데스크톱) / 38개(모바일).
- `?w` 변형 서빙은 정상(webp + immutable). 변형 폴백 가설은 반증.

---

## 근본 원인 (v2 우선순위)

| # | 원인 | 데스크톱 근거 | 위치 |
|---|---|---|---|
| **P0-1** | 히어로 진행바 `width` per-frame JS 갱신 → 상시 강제 레이아웃(메인스레드 8~14% idle 점유) | 변경요소 1개=진행바, control dScript 스로틀 비례↑ | `hero-carousel.tsx:27,77-94,208-209` |
| **P0-2** | 히어로 hover가 `top/padding`(레이아웃) 애니메이트 | hover 시 +30~37 layout, transition top,padding/0.3s | `hero-carousel.tsx:421,553` |
| **P0-3** | 히어로 이미지 1920px(over 6×) 무변형 + 34 will-change 영구 | natW 1920, wc count 34 | `hero-carousel.tsx`(ImageBg), `globals.css`(.card-animate) |
| **P1** | will-change 과다·오프스크린 영구 승격(실GPU 메모리 압박 위험; headless 미재현) | wc 34, 오프스크린 포함 | 각 카드/`globals.css` |
| **P2** | 하이라이트 정적 이미지 404 2건(onError 리렌더) | 콘솔 404×2 | `highlights-carousel.tsx`, `/public/images` |
| ❌반증 | 메가메뉴 열림 지연 | ≤32ms@6× | — |
| ❌반증 | 최신교육정보 카드 hover | layout 추가≈0 | — |

---

## 이전 3개 수정이 안 먹힌 이유
- **54f9be4 (will-change)**: 이미지 transform 컴포지팅만 다룸 → **진행바 상시 레이아웃·hero top/padding 레이아웃 애니메이션(주범)을 안 건드림**. 게다가 34개 과다 적용.
- **70b8f44 (`?w` 변형)**: 카드엔 유효하나 **가장 큰 히어로 원본(1920px)은 `?w` 미적용**.
- **2995c44 (content-visibility)**: 홈엔 `.cv-card` 0개 → 홈 hover 무효.
- **공통**: 세 수정 모두 **히어로 캐러셀의 상시 JS 레이아웃(진행바)** 이라는 메인스레드 상시 점유원을 인지하지 못함.

---

## 권장 수정안 (v2, 우선순위)
> `main` 직접 작업. 코드 수정은 별도 승인 후 진행.

- **[P0-1] 진행바를 컴포지터 친화로 전환** — `width: ${progress}%` → **`transform: scaleX(${progress/100})` + `transform-origin:left`**(scaleX는 레이아웃 없이 컴포지트). 더불어 **per-frame `setProgress` 리렌더 제거**: rAF 안에서 React state 대신 **ref로 DOM `style.transform` 직접 갱신**하거나, 가능하면 **CSS transition/animation(슬라이드 길이만큼 1회 scaleX 0→1)**으로 대체. → idle 메인스레드 상시 점유 제거.
- **[P0-2] 히어로 hover 애니메이션 교체** — `transition-[top,padding]` + `group-hover:top-0/pt-6/pt-10`(`:421`,`:553`)을 **`transform: translateY()` + opacity** 기반으로 변경. `top/padding` 애니메이트 제거 → hover 시 layout 0.
- **[P0-3] 히어로 이미지도 변형 경유** — 메인 `ImageBg`를 `thumbSrc(article.thumbnail, 1280)`로(현재 원본 1920px 직참조).
- **[P1] will-change 다이어트** — 오프스크린/전역 영구 적용 제거, in-view 한정 토글. `.card-animate`는 `animationend`에 해제. (실GPU 환경에서 효과 큼)
- **[P2] 404 정리** — `/images/highlight-suneung.jpg`, `highlight-gpa.jpg` 경로/데이터 수정.
- **[P2] 전환 시간 재검토(체감)** — 다수 hover 전환이 `duration-300`(300ms). 즉답 기대 대비 "느리게" 느껴질 수 있어 150~200ms 단축 검토.

---

## 검증 방법
1. **회귀(자동, 본 스크립트 재사용)**: 수정 후 동일 CDP 측정에서
   - `control` dScriptMs/dLayoutCount **급감**(진행바 P0-1 효과),
   - `hero hover` dLayoutCount **≈0**(P0-2 효과),
   - 히어로 `naturalWidth ≤ 1280`(P0-3),
   - `will-change != auto` 수 34 → 한 자릿수(P1).
2. **육안(권장)**: 실디바이스 또는 데스크톱 Chrome DevTools **Performance(GPU on)** 로 hover 시 *Layout/Recalc* 항목 소멸·idle 시 진행바 Layout 소멸 확인. (headless·rAF 지표로는 육안 jank 판정 불가)

---

## 적용 결과 (2026-06-09, 구현 완료)
우선순위대로 코드 수정 적용:
- **P0-1** `hero-carousel.tsx` — 진행바를 `width(%)` per-frame `setProgress` → **`scaleX` ref 직접 갱신**(React 리렌더 + 레이아웃 동시 제거).
- **P0-2** `hero-carousel.tsx:421,553` — `transition-[top,padding]` 제거(최종 hover 상태 동일, 레이아웃 애니메이션 제거 + 즉답감↑).
- **P0-3** `hero-carousel.tsx` ImageBg — `src={thumbSrc(src, 1280)}`(1920px 원본 → 1280 webp 변형).
- **P1** `globals.css` `.card-animate` will-change 제거 + 이미지 7곳 `will-change-transform` → `group-hover:will-change-transform`(온디맨드 승격, 영구 레이어 제거).
- **P2** 404는 코드가 아닌 DB 시드 데이터(`highlights` 테이블, `seed.sql:65,67`의 `/images/highlight-*.jpg`) → 어드민/DB에서 thumbnail 교체 필요(UI는 onError 폴백 보유). 전환시간 단축은 주관적이라 보류.

**검증**:
- `typecheck`·`lint`·`build`(exit 0)·기존 vitest **146개 전부 통과**. `thumbSrc(…,1280)` 경로는 `thumbnail.test.ts`가 기존 커버.
- **합성 CDP 증명**(width vs scaleX, 1초 rAF): LayoutCount **75 → 1**, LayoutMs **3.86 → 0.08**. 라이브 idle 상시 레이아웃(≈75/초)이 진행바 width 애니메이션이었음을 확정하고 제거를 입증.
- 잔여: 실GPU/실디바이스 육안 확인 및 배포 후 라이브 재측정(위 검증 1·2)은 권장 사항으로 남김.
