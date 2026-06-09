import { asc, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { Header } from "./header";
import { getDb } from "@/db";
import { headerLinks, navMenus, pictureFrameItems } from "@/db/schema";
import { buildNavTree, type NavGroup, type NavMenuItem } from "@/lib/default-nav";

type HeaderLink = {
  id: string;
  label: string;
  href: string;
  icon: string | null;
  imageUrl: string | null;
};

type HeaderData = {
  initialNavGroups: NavGroup[];
  initialHeaderLinks: HeaderLink[];
  hasPictureFrame: boolean;
};

// nav_menus / header_links / picture_frame 개수는 어드민이 가끔만 바꾸는데
// 모든 (main) 페이지가 force-dynamic 이라 매 요청 SSR 핫패스에서 D1 3쿼리를 반복했다(TTFB 누적).
// Data Cache(tag: "header-data")로 묶어 캐시 적중 시 D1 왕복 0. 어드민 변경 라우트에서
// revalidateTag("header-data") 로 즉시 무효화하고, 안전망으로 60초 TTL 도 둔다.
const getHeaderData = unstable_cache(
  async (): Promise<HeaderData> => {
    const db = await getDb();

    // 3개 읽기 병렬 조회. allSettled 로 개별 실패 격리(헤더는 항상 렌더).
    const [navRes, linkRes, frameRes] = await Promise.allSettled([
      db.select().from(navMenus).orderBy(asc(navMenus.sortOrder)),
      db.select().from(headerLinks).orderBy(asc(headerLinks.sortOrder)),
      db.select({ count: sql<number>`COUNT(*)` }).from(pictureFrameItems),
    ]);

    let initialNavGroups: NavGroup[] = [];
    if (navRes.status === "fulfilled") {
      const items: NavMenuItem[] = navRes.value.map((r) => ({
        id: r.id,
        parentId: r.parentId ?? null,
        label: r.label,
        href: r.href,
        sortOrder: r.sortOrder ?? 0,
      }));
      if (items.length > 0) initialNavGroups = buildNavTree(items);
    }

    let initialHeaderLinks: HeaderLink[] = [];
    if (linkRes.status === "fulfilled") {
      initialHeaderLinks = linkRes.value.map((r) => ({
        id: r.id,
        label: r.label,
        href: r.href,
        icon: r.icon ?? null,
        imageUrl: r.imageUrl ?? null,
      }));
    }

    // 액자 콘텐츠가 1개 이상일 때만 헤더에 '액자' 버튼 노출.
    // 실제 슬라이드 데이터는 오버레이가 열릴 때 클라이언트에서 /api/picture-frames 로 지연 fetch.
    const hasPictureFrame =
      frameRes.status === "fulfilled" && Number(frameRes.value[0]?.count ?? 0) > 0;

    return { initialNavGroups, initialHeaderLinks, hasPictureFrame };
  },
  ["header-data"],
  { tags: ["header-data"], revalidate: 60 },
);

// 헤더 부모 카테고리 FOUC 제거를 위한 RSC 래퍼.
export async function HeaderServer() {
  const { initialNavGroups, initialHeaderLinks, hasPictureFrame } =
    await getHeaderData();

  return (
    <Header
      initialNavGroups={initialNavGroups}
      initialHeaderLinks={initialHeaderLinks}
      hasPictureFrame={hasPictureFrame}
    />
  );
}
