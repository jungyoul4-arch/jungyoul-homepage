import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ImageResponse } from "next/og";

const ALLOWED_KEYS = ["logo_url"];

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const db = await getDb();
    const rows = await db.select().from(siteSettings).all();
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return NextResponse.json(settings);
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function generateFavicon(logoUrl: string): Promise<string | null> {
  try {
    const key = logoUrl.replace("/api/admin/upload/", "");
    const { env } = await getCloudflareContext({ async: true });
    const object = await env.IMAGES_BUCKET.get(key);
    if (!object) return null;

    const buffer = await object.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mime = object.httpMetadata?.contentType || "image/png";
    const dataSrc = `data:${mime};base64,${base64}`;

    // ImageResponse로 32x32 리사이징
    const response = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
          }}
        >
          <img
            src={dataSrc}
            width={32}
            height={32}
            style={{ objectFit: "contain" }}
          />
        </div>
      ),
      { width: 32, height: 32 }
    );

    const faviconBuffer = await response.arrayBuffer();
    const faviconKey = "favicon/favicon-32x32.png";

    await env.IMAGES_BUCKET.put(faviconKey, faviconBuffer, {
      httpMetadata: { contentType: "image/png" },
    });

    return `/api/admin/upload/${faviconKey}`;
  } catch {
    return null;
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { key, value } = await request.json();

    if (!key || !ALLOWED_KEYS.includes(key)) {
      return NextResponse.json(
        { error: "허용되지 않는 설정 키입니다." },
        { status: 400 }
      );
    }

    const db = await getDb();

    if (value === "" || value === null) {
      // 로고 초기화: logo_url과 favicon_url 모두 삭제
      await db.delete(siteSettings).where(eq(siteSettings.key, "logo_url"));
      await db.delete(siteSettings).where(eq(siteSettings.key, "favicon_url"));
    } else {
      // logo_url 저장
      await db
        .insert(siteSettings)
        .values({ key, value, updatedAt: new Date().toISOString() })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { value, updatedAt: new Date().toISOString() },
        });

      // 리사이징된 파비콘 생성 및 저장
      const faviconUrl = await generateFavicon(value);
      if (faviconUrl) {
        await db
          .insert(siteSettings)
          .values({
            key: "favicon_url",
            value: faviconUrl,
            updatedAt: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: siteSettings.key,
            set: { value: faviconUrl, updatedAt: new Date().toISOString() },
          });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
