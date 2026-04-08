# Tracking Codes + OG/Hero Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tracking code management to the admin dashboard, and improve OG tags + add hero images to fixed pages.

**Architecture:** Extend existing Cloudflare D1 database with a `tracking_codes` table. Add CRUD API routes following existing patterns (requireAdmin, drizzle-zod validation). Inject active codes into layout.tsx server-side. Update fixed pages with hero images and per-page OG images.

**Tech Stack:** Next.js 16, Drizzle ORM (D1 SQLite), Cloudflare R2, JWT auth (existing)

---

## File Map

### New Files
- `src/app/api/tracking-codes/route.ts` — Public GET for tracking codes
- `src/app/api/admin/tracking-codes/route.ts` — Admin POST (create)
- `src/app/api/admin/tracking-codes/[id]/route.ts` — Admin PUT/DELETE
- `src/app/admin/tracking-codes/page.tsx` — Admin tracking codes list + CRUD UI
- `src/components/tracking-code-injector.tsx` — Server component for layout.tsx injection
- `src/components/hero-banner.tsx` — Reusable hero banner component for fixed pages
- `public/images/hero-about.jpg` — Placeholder hero images (6 files)
- `public/images/hero-articles.jpg`
- `public/images/hero-contact.jpg`
- `public/images/hero-faq.jpg`
- `public/images/hero-location.jpg`
- `public/images/hero-teachers.jpg`

### Modified Files
- `src/db/schema.ts` — Add `trackingCodes` table
- `src/lib/validation.ts` — Add tracking code validation schemas
- `src/app/layout.tsx` — Integrate TrackingCodeInjector
- `src/app/admin/layout.tsx` — Add sidebar item for tracking codes
- `src/app/admin/page.tsx` — Add tracking codes stat card
- `src/app/articles/[slug]/page.tsx:30-31` — Use thumbnail as og:image
- `src/app/about/page.tsx:3-14` — Add hero image + og:image
- `src/app/articles/page.tsx` — Add hero image + og:image
- `src/app/contact/page.tsx` — Add hero image + og:image
- `src/app/faq/page.tsx` — Add hero image + og:image
- `src/app/location/page.tsx` — Add hero image + og:image
- `src/app/teachers/page.tsx` — Add hero image + og:image

---

### Task 1: Tracking Codes DB Schema + Validation

**Files:**
- Modify: `src/db/schema.ts:39` (after videos table)
- Modify: `src/lib/validation.ts:71` (after videos schemas)

- [ ] **Step 1: Add tracking_codes table to schema**

Add to `src/db/schema.ts` after the `videos` table (line 39):

```typescript
export const trackingCodes = sqliteTable("tracking_codes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  position: text("position").notNull(), // "head" | "body-start" | "body-end"
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});
```

- [ ] **Step 2: Add validation schemas**

Add to `src/lib/validation.ts` after the videos schemas (line 71):

```typescript
import { trackingCodes } from "@/db/schema";

// Tracking Codes
export const insertTrackingCodeSchema = createInsertSchema(trackingCodes, {
  name: (schema) => schema.min(1).max(100),
  code: (schema) => schema.min(1).max(50_000),
  position: (schema) => schema.refine((v) => ["head", "body-start", "body-end"].includes(v), {
    message: "위치는 head, body-start, body-end 중 하나여야 합니다.",
  }),
}).omit({ id: true, createdAt: true });

export const updateTrackingCodeSchema = createUpdateSchema(trackingCodes, {
  name: (schema) => schema.max(100),
  code: (schema) => schema.max(50_000),
  position: (schema) => schema.refine((v) => !v || ["head", "body-start", "body-end"].includes(v), {
    message: "위치는 head, body-start, body-end 중 하나여야 합니다.",
  }),
}).omit({ id: true, createdAt: true });
```

Note: `trackingCodes` import must be added to existing import line in validation.ts.

- [ ] **Step 3: Run D1 migration**

```bash
cd ~/Desktop/jungyoul-homepage
npx wrangler d1 execute DB --local --command "CREATE TABLE IF NOT EXISTS tracking_codes (id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL, position TEXT NOT NULL, enabled INTEGER DEFAULT 1, created_at TEXT);"
```

Verify the table exists:
```bash
npx wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name='tracking_codes';"
```

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts src/lib/validation.ts
git commit -m "feat: add tracking_codes DB schema and validation"
```

---

### Task 2: Tracking Codes API Routes

**Files:**
- Create: `src/app/api/tracking-codes/route.ts`
- Create: `src/app/api/admin/tracking-codes/route.ts`
- Create: `src/app/api/admin/tracking-codes/[id]/route.ts`

- [ ] **Step 1: Create public GET route**

Create `src/app/api/tracking-codes/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { trackingCodes } from "@/db/schema";

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.select().from(trackingCodes);
    return NextResponse.json(rows);
  } catch (e) {
    console.error("tracking-codes GET error:", e);
    return NextResponse.json([], { status: 200 });
  }
}
```

- [ ] **Step 2: Create admin POST route**

Create `src/app/api/admin/tracking-codes/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { trackingCodes } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { insertTrackingCodeSchema, errorResponse } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = insertTrackingCodeSchema.parse(body);
    const db = await getDb();
    const id = crypto.randomUUID();

    await db.insert(trackingCodes).values({
      id,
      ...parsed,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
```

- [ ] **Step 3: Create admin PUT/DELETE route**

Create `src/app/api/admin/tracking-codes/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { trackingCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { updateTrackingCodeSchema, errorResponse } from "@/lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateTrackingCodeSchema.parse(body);
    const db = await getDb();

    await db.update(trackingCodes).set(parsed).where(eq(trackingCodes.id, id));

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const db = await getDb();

    await db.delete(trackingCodes).where(eq(trackingCodes.id, id));

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tracking-codes/ src/app/api/admin/tracking-codes/
git commit -m "feat: add tracking codes CRUD API routes"
```

---

### Task 3: Tracking Code Injector (layout.tsx)

**Files:**
- Create: `src/components/tracking-code-injector.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create TrackingCodeInjector server component**

Create `src/components/tracking-code-injector.tsx`:

```typescript
import { getDb } from "@/db";
import { trackingCodes } from "@/db/schema";
import { eq } from "drizzle-orm";

interface TrackingCode {
  id: string;
  code: string;
  position: string;
}

async function getEnabledCodes(): Promise<TrackingCode[]> {
  try {
    const db = await getDb();
    return await db
      .select({ id: trackingCodes.id, code: trackingCodes.code, position: trackingCodes.position })
      .from(trackingCodes)
      .where(eq(trackingCodes.enabled, true));
  } catch {
    return [];
  }
}

export async function TrackingCodeHead() {
  const codes = await getEnabledCodes();
  const headCodes = codes.filter((c) => c.position === "head");
  if (headCodes.length === 0) return null;

  return (
    <>
      {headCodes.map((c) => (
        <script
          key={c.id}
          dangerouslySetInnerHTML={{ __html: c.code }}
        />
      ))}
    </>
  );
}

export async function TrackingCodeBodyStart() {
  const codes = await getEnabledCodes();
  const bodyCodes = codes.filter((c) => c.position === "body-start");
  if (bodyCodes.length === 0) return null;

  return (
    <>
      {bodyCodes.map((c) => (
        <div key={c.id} dangerouslySetInnerHTML={{ __html: c.code }} />
      ))}
    </>
  );
}

export async function TrackingCodeBodyEnd() {
  const codes = await getEnabledCodes();
  const bodyCodes = codes.filter((c) => c.position === "body-end");
  if (bodyCodes.length === 0) return null;

  return (
    <>
      {bodyCodes.map((c) => (
        <div key={c.id} dangerouslySetInnerHTML={{ __html: c.code }} />
      ))}
    </>
  );
}
```

- [ ] **Step 2: Integrate into layout.tsx**

In `src/app/layout.tsx`, add imports and embed components:

Add import at top:
```typescript
import { TrackingCodeHead, TrackingCodeBodyStart, TrackingCodeBodyEnd } from "@/components/tracking-code-injector";
```

In the JSX, add `<TrackingCodeHead />` inside `<head>` after the JSON-LD script (after line 137), add `<TrackingCodeBodyStart />` right after `<body>` open tag (after line 139), and add `<TrackingCodeBodyEnd />` right before `</body>` (before line 147).

```tsx
<head>
  {/* ... existing meta and JSON-LD ... */}
  <TrackingCodeHead />
</head>
<body className="min-h-full flex flex-col font-[family-name:var(--font-noto-sans-kr)]">
  <TrackingCodeBodyStart />
  <AuthProvider>
    <Header />
    <main className="flex-1">{children}</main>
    <Footer />
    <InlineEditModal />
  </AuthProvider>
  <TrackingCodeBodyEnd />
</body>
```

- [ ] **Step 3: Verify dev server starts without errors**

```bash
cd ~/Desktop/jungyoul-homepage && npm run dev
```

Open http://localhost:3000 — verify page loads. Check HTML source for no injection errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/tracking-code-injector.tsx src/app/layout.tsx
git commit -m "feat: inject tracking codes into layout.tsx from DB"
```

---

### Task 4: Tracking Codes Admin UI

**Files:**
- Create: `src/app/admin/tracking-codes/page.tsx`
- Modify: `src/app/admin/layout.tsx:14-19`
- Modify: `src/app/admin/page.tsx:6-18`

- [ ] **Step 1: Add sidebar item in admin layout**

In `src/app/admin/layout.tsx`, add to imports:
```typescript
import { Code } from "lucide-react";
```

Add to `sidebarItems` array (after videos item, line 19):
```typescript
{ label: "추적 코드", href: "/admin/tracking-codes", icon: Code },
```

- [ ] **Step 2: Add tracking codes stat card to dashboard**

In `src/app/admin/page.tsx`, add to imports:
```typescript
import { Code } from "lucide-react";
```

Update `Stats` interface to include `trackingCodes: number`.

Add to `cards` array:
```typescript
{ key: "trackingCodes" as const, label: "추적 코드", icon: Code, href: "/admin/tracking-codes", color: "red" },
```

Update the `load()` function to also fetch tracking codes:
```typescript
const tc = await fetch("/api/tracking-codes").then((r) => r.json());
```
And include in setStats: `trackingCodes: tc.length`.

- [ ] **Step 3: Create tracking codes admin page**

Create `src/app/admin/tracking-codes/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

interface TrackingCode {
  id: string;
  name: string;
  code: string;
  position: string;
  enabled: boolean;
  createdAt: string;
}

const POSITIONS = [
  { value: "head", label: "<head>" },
  { value: "body-start", label: "<body> 시작" },
  { value: "body-end", label: "<body> 끝" },
];

export default function AdminTrackingCodesPage() {
  const [codes, setCodes] = useState<TrackingCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TrackingCode | null>(null);
  const [isNew, setIsNew] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/tracking-codes");
      if (!res.ok) throw new Error();
      setCodes(await res.json());
    } catch {
      setCodes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleNew() {
    setEditing({ id: "", name: "", code: "", position: "head", enabled: true, createdAt: "" });
    setIsNew(true);
  }

  function handleEdit(tc: TrackingCode) {
    setEditing({ ...tc });
    setIsNew(false);
  }

  async function handleSave() {
    if (!editing) return;
    const method = isNew ? "POST" : "PUT";
    const url = isNew ? "/api/admin/tracking-codes" : `/api/admin/tracking-codes/${editing.id}`;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editing.name,
        code: editing.code,
        position: editing.position,
        enabled: editing.enabled,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "저장 실패");
      return;
    }
    setEditing(null);
    load();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 추적 코드를 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/tracking-codes/${id}`, { method: "DELETE" });
    load();
  }

  async function handleToggle(tc: TrackingCode) {
    await fetch(`/api/admin/tracking-codes/${tc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !tc.enabled }),
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">추적 코드 관리</h1>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          추가
        </button>
      </div>

      {/* async/defer 안내 */}
      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 text-sm text-amber-700">
        💡 추적 코드에 <code>async</code> 또는 <code>defer</code> 속성을 추가하면 페이지 로딩 속도에 영향을 주지 않습니다.
        {codes.length >= 5 && (
          <p className="mt-1 font-medium">⚠️ 추적 코드가 {codes.length}개입니다. 너무 많으면 성능이 저하될 수 있습니다.</p>
        )}
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {isNew ? "새 추적 코드" : "추적 코드 수정"}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="예: Google Analytics"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">삽입 위치</label>
              <select
                value={editing.position}
                onChange={(e) => setEditing({ ...editing, position: e.target.value })}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">코드</label>
              <textarea
                value={editing.code}
                onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                rows={6}
                placeholder="<script async src=&quot;...&quot;></script>"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.enabled}
                onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                id="enabled"
              />
              <label htmlFor="enabled" className="text-sm text-gray-700">활성화</label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                <Check size={14} /> 저장
              </button>
              <button
                onClick={() => setEditing(null)}
                className="flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
              >
                <X size={14} /> 취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div className="space-y-3">
          {codes.map((tc) => (
            <div key={tc.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{tc.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    tc.position === "head" ? "bg-blue-100 text-blue-700" :
                    tc.position === "body-start" ? "bg-green-100 text-green-700" :
                    "bg-purple-100 text-purple-700"
                  }`}>
                    {POSITIONS.find((p) => p.value === tc.position)?.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${tc.enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {tc.enabled ? "활성" : "비활성"}
                  </span>
                </div>
                <pre className="text-xs text-gray-500 truncate max-w-lg font-mono">{tc.code.slice(0, 80)}...</pre>
              </div>
              <div className="flex items-center gap-1 ml-4 shrink-0">
                <button onClick={() => handleToggle(tc)} className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors" title={tc.enabled ? "비활성화" : "활성화"}>
                  {tc.enabled ? <Check size={15} /> : <X size={15} />}
                </button>
                <button onClick={() => handleEdit(tc)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(tc.id, tc.name)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          {codes.length === 0 && (
            <p className="text-center text-gray-400 py-8">등록된 추적 코드가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify admin page renders**

```bash
npm run dev
```

Navigate to http://localhost:3000/admin/tracking-codes — verify page loads, sidebar shows "추적 코드" item.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/tracking-codes/ src/app/admin/layout.tsx src/app/admin/page.tsx
git commit -m "feat: add tracking codes admin UI with CRUD"
```

---

### Task 5: Article OG Image + Schema Markup Enrichment

**Files:**
- Modify: `src/app/articles/[slug]/page.tsx:30-31` (generateMetadata og:image)
- Modify: `src/app/articles/[slug]/page.tsx:78-107` (Article JSON-LD)

- [ ] **Step 1: Update generateMetadata to use thumbnail as og:image**

In `src/app/articles/[slug]/page.tsx`, change the `images` field in `openGraph` from:

```typescript
images: [{ url: "/og-image.png", width: 1200, height: 630 }],
```

to:

```typescript
images: [{ url: article.thumbnail || "/og-image.png", width: 1200, height: 630 }],
```

This uses the article's thumbnail if available, falling back to the default.

- [ ] **Step 2: Enrich Article JSON-LD schema**

In `src/app/articles/[slug]/page.tsx`, update the Article JSON-LD script (lines 78-107).

Change the existing JSON-LD from:
```typescript
{
  "@context": "https://schema.org",
  "@type": "Article",
  headline: article.title,
  description: article.excerpt,
  image: ["https://www.jungyoul.net/og-image.png"],
  datePublished: article.date.replace(/\//g, "-"),
  dateModified: article.date.replace(/\//g, "-"),
  author: {
    "@type": "Organization",
    name: "정율 교육정보",
    url: "https://www.jungyoul.net",
  },
  publisher: {
    "@type": "Organization",
    name: "정율 교육정보",
    logo: {
      "@type": "ImageObject",
      url: "https://www.jungyoul.net/logo.png",
    },
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": `https://www.jungyoul.net/articles/${article.slug}`,
  },
}
```

to:
```typescript
{
  "@context": "https://schema.org",
  "@type": "Article",
  headline: article.title,
  description: article.excerpt,
  image: article.thumbnail
    ? [`https://www.jungyoul.net${article.thumbnail}`]
    : ["https://www.jungyoul.net/og-image.png"],
  datePublished: article.date.replace(/\//g, "-"),
  dateModified: article.updatedAt
    ? article.updatedAt.split("T")[0]
    : article.date.replace(/\//g, "-"),
  author: {
    "@type": "Organization",
    name: "정율 교육정보",
    url: "https://www.jungyoul.net",
  },
  publisher: {
    "@type": "Organization",
    name: "정율 교육정보",
    logo: {
      "@type": "ImageObject",
      url: "https://www.jungyoul.net/logo.png",
    },
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": `https://www.jungyoul.net/articles/${article.slug}`,
  },
  articleSection: article.categoryLabel,
  wordCount: article.content
    ? article.content.replace(/<[^>]*>/g, "").trim().length
    : undefined,
  keywords: [article.categoryLabel, "정율 교육정보", "입시", "교육"],
  inLanguage: "ko",
  isAccessibleForFree: true,
}
```

Changes:
- `image`: hardcoded og-image.png → article thumbnail (with absolute URL)
- `dateModified`: was same as datePublished → now uses DB `updatedAt`
- `articleSection`: new — maps to categoryLabel (입시전략, 교육칼럼 등)
- `wordCount`: new — extracted from HTML content (tags stripped)
- `keywords`: new — category + base keywords
- `inLanguage`: new — "ko"
- `isAccessibleForFree`: new — true (무료 콘텐츠)

- [ ] **Step 3: Commit**

```bash
git add src/app/articles/[slug]/page.tsx
git commit -m "feat: enrich article schema markup + use thumbnail as og:image"
```

---

### Task 6: Hero Banner Component + Placeholder Images

**Files:**
- Create: `src/components/hero-banner.tsx`
- Create: `public/images/hero-*.jpg` (6 placeholder files)

- [ ] **Step 1: Create HeroBanner component**

Create `src/components/hero-banner.tsx`:

```tsx
import Image from "next/image";

interface HeroBannerProps {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
}

export function HeroBanner({ src, alt, title, subtitle }: HeroBannerProps) {
  return (
    <div className="relative w-full aspect-[21/9] max-h-[320px] overflow-hidden bg-gray-100">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
      {(title || subtitle) && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end">
          <div className="max-w-[1280px] mx-auto w-full px-4 pb-8">
            {title && <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>}
            {subtitle && <p className="text-sm md:text-base text-white/80 mt-2">{subtitle}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Generate placeholder hero images**

Create 6 placeholder SVG images converted to JPG (1200x514, 21:9 ratio). Since we need actual image files for `next/image`, create minimal placeholder images:

```bash
cd ~/Desktop/jungyoul-homepage/public/images

# Create placeholder images using a simple approach
for page in about articles contact faq location teachers; do
  convert -size 1200x514 "xc:#f0f4f8" -gravity center -pointsize 48 -fill "#94a3b8" -annotate 0 "Hero - ${page}" "hero-${page}.jpg" 2>/dev/null || \
  python3 -c "
from PIL import Image, ImageDraw, ImageFont
img = Image.new('RGB', (1200, 514), '#f0f4f8')
d = ImageDraw.Draw(img)
d.text((600, 257), 'Hero - ${page}', fill='#94a3b8', anchor='mm')
img.save('hero-${page}.jpg')
" 2>/dev/null || \
  echo "Install ImageMagick or Pillow to generate placeholders, or add images manually"
done
```

If image generation tools are not available, create a note that placeholder images need to be added manually to `public/images/`.

- [ ] **Step 3: Commit**

```bash
git add src/components/hero-banner.tsx public/images/hero-*.jpg
git commit -m "feat: add HeroBanner component and placeholder hero images"
```

---

### Task 7: Fixed Pages — Add Hero + OG Image

**Files:**
- Modify: `src/app/about/page.tsx`
- Modify: `src/app/articles/page.tsx`
- Modify: `src/app/contact/page.tsx`
- Modify: `src/app/faq/page.tsx`
- Modify: `src/app/location/page.tsx`
- Modify: `src/app/teachers/page.tsx`

Each page gets the same two changes:
1. Add `og:image` to metadata
2. Add `<HeroBanner>` at the top of the page content

- [ ] **Step 1: Update about/page.tsx**

Add to metadata `openGraph`:
```typescript
openGraph: {
  title: "회사소개 | 정율 교육정보",
  description: "주식회사정율 — 맞춤형 교육 전문 기업",
  images: [{ url: "/images/hero-about.jpg", width: 1200, height: 514 }],
},
```

Add import and HeroBanner at top of page content:
```tsx
import { HeroBanner } from "@/components/hero-banner";

// Inside the return, before the existing <div>:
<HeroBanner
  src="/images/hero-about.jpg"
  alt="정율 교육정보 회사소개"
/>
```

- [ ] **Step 2: Update articles/page.tsx**

Add to metadata `openGraph.images`:
```typescript
images: [{ url: "/images/hero-articles.jpg", width: 1200, height: 514 }],
```

Add HeroBanner at top of page content:
```tsx
<HeroBanner src="/images/hero-articles.jpg" alt="정율 교육정보" />
```

- [ ] **Step 3: Update contact/page.tsx**

Add to metadata `openGraph.images`:
```typescript
images: [{ url: "/images/hero-contact.jpg", width: 1200, height: 514 }],
```

Add HeroBanner at top of page content:
```tsx
<HeroBanner src="/images/hero-contact.jpg" alt="정율 교육정보 상담신청" />
```

- [ ] **Step 4: Update faq/page.tsx**

Add to metadata `openGraph.images`:
```typescript
images: [{ url: "/images/hero-faq.jpg", width: 1200, height: 514 }],
```

Add HeroBanner at top of page content:
```tsx
<HeroBanner src="/images/hero-faq.jpg" alt="정율 교육정보 자주 묻는 질문" />
```

- [ ] **Step 5: Update location/page.tsx**

Add to metadata `openGraph.images`:
```typescript
images: [{ url: "/images/hero-location.jpg", width: 1200, height: 514 }],
```

Add HeroBanner at top of page content:
```tsx
<HeroBanner src="/images/hero-location.jpg" alt="정율 교육정보 찾아오는 길" />
```

- [ ] **Step 6: Update teachers/page.tsx**

Add to metadata `openGraph.images`:
```typescript
images: [{ url: "/images/hero-teachers.jpg", width: 1200, height: 514 }],
```

Add HeroBanner at top of page content:
```tsx
<HeroBanner src="/images/hero-teachers.jpg" alt="정율 교육정보 선생님 소개" />
```

- [ ] **Step 7: Verify all pages render**

```bash
npm run dev
```

Check each page loads without errors: /about, /articles, /contact, /faq, /location, /teachers.

- [ ] **Step 8: Commit**

```bash
git add src/app/about/page.tsx src/app/articles/page.tsx src/app/contact/page.tsx src/app/faq/page.tsx src/app/location/page.tsx src/app/teachers/page.tsx
git commit -m "feat: add hero banners and per-page og:image to fixed pages"
```

---

### Task 8: Type Check + Build Verification

- [ ] **Step 1: Run TypeScript check**

```bash
cd ~/Desktop/jungyoul-homepage
rm -rf .next
npx tsc --noEmit
```

Fix any type errors before proceeding.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Verify build completes without errors.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type/lint errors from tracking codes + hero features"
```
