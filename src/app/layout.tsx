import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "정율 교육정보 — 입시·교육 전문 미디어",
    template: "%s | 정율 교육정보",
  },
  description:
    "정율 교육정보는 대입 입시, 수능, 내신, 논술 등 교육 정보를 전문적으로 제공하는 미디어입니다. 학생과 학부모를 위한 최신 입시 전략과 교육 칼럼을 만나보세요.",
  keywords: [
    "입시정보",
    "수능전략",
    "논술",
    "내신관리",
    "고교학점제",
    "대입",
    "교육칼럼",
    "정율사관",
    "부천학원",
  ],
  authors: [{ name: "정율 교육정보" }],
  creator: "주식회사정율",
  publisher: "정율 교육정보",
  formatDetection: {
    telephone: false,
  },
  metadataBase: new URL("https://www.jungyoul.net"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://www.jungyoul.net",
    siteName: "정율 교육정보",
    title: "정율 교육정보 — 입시·교육 전문 미디어",
    description:
      "대입 입시, 수능, 내신, 논술 등 교육 정보를 전문적으로 제공합니다.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "정율 교육정보",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "정율 교육정보 — 입시·교육 전문 미디어",
    description:
      "대입 입시, 수능, 내신, 논술 등 교육 정보를 전문적으로 제공합니다.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: "YOUR_GOOGLE_VERIFICATION_CODE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} h-full antialiased`}>
      <head>
        <meta name="naver-site-verification" content="YOUR_NAVER_VERIFICATION_CODE" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              name: "정율 교육정보",
              alternateName: "정율사관학원",
              url: "https://www.jungyoul.net",
              logo: "https://www.jungyoul.net/logo.png",
              description:
                "대입 입시, 수능, 내신, 논술 등 교육 정보를 전문적으로 제공하는 미디어",
              address: {
                "@type": "PostalAddress",
                streetAddress: "길주로91 601호(비잔티움 6층)",
                addressLocality: "부천시",
                addressRegion: "경기도",
                postalCode: "14544",
                addressCountry: "KR",
              },
              telephone: "032-321-9937",
              email: "jungyoul3@naver.com",
              sameAs: [
                "https://www.instagram.com/jysk_official/",
                "https://blog.naver.com/jungyoul_edu",
                "https://www.youtube.com/@jungyoulTV",
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-noto-sans-kr)]">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
