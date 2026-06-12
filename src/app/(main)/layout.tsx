import { HeaderServer } from "@/components/header-server";
import { Footer } from "@/components/footer";
import { KakaoFab } from "@/components/kakao-fab";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KAKAO_CHANNEL_URL } from "@/lib/site";

// 카카오톡 채널 URL — 어드민 설정(site_settings.kakao_channel_url)이 있으면 사용, 없으면 상수 폴백.
async function getKakaoChannelUrl(): Promise<string> {
  try {
    const db = await getDb();
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "kakao_channel_url"))
      .limit(1);
    return row?.value || KAKAO_CHANNEL_URL;
  } catch {
    return KAKAO_CHANNEL_URL;
  }
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const kakaoUrl = await getKakaoChannelUrl();
  return (
    <>
      <HeaderServer />
      <main className="flex-1">{children}</main>
      <Footer />
      <KakaoFab url={kakaoUrl} />
    </>
  );
}
