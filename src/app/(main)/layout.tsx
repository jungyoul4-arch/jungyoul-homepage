import { HeaderServer } from "@/components/header-server";
import { Footer } from "@/components/footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <HeaderServer />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
