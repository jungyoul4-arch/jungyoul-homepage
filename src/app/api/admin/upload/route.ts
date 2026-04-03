import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/admin-auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "허용되지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP, SVG만 가능)" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 10MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const now = new Date();
    const path = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const random = crypto.randomUUID().slice(0, 8);
    const key = `${path}/${Date.now()}-${random}.${ext}`;

    const { env } = await getCloudflareContext({ async: true });
    const arrayBuffer = await file.arrayBuffer();

    await env.IMAGES_BUCKET.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type },
    });

    // R2 퍼블릭 URL (커스텀 도메인 설정 후 변경)
    // 기본: https://<account-id>.r2.cloudflarestorage.com/<bucket>/<key>
    // 커스텀 도메인 예: https://images.jungyoul.net/<key>
    const url = `/api/admin/upload/${key}`;

    return NextResponse.json({ url, key });
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: `업로드 실패: ${message}` }, { status: 500 });
  }
}
