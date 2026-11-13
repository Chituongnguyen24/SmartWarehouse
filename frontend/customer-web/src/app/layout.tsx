import type { Metadata } from "next";
import "./globals.css";
import { Header, Footer, cn } from "@/shared";
import { CustomerFloatingActions } from "@/features/support";
import { RealtimeProductSync } from "@/features/catalog";
import { AuthInitializer } from "@/features/auth";
import { Geist } from "next/font/google";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "C.T Mart - Siêu thị trực tuyến uy tín",
  description: "Mua sắm dễ dàng tại C.T Mart – Siêu thị trực tuyến dành cho bạn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={cn("font-sans", geist.variable)}>
      <body>
        <AuthInitializer>
          <Header />
          <main className="overflow-x-hidden">{children}</main>
          <Footer />
          <CustomerFloatingActions />
          <RealtimeProductSync />
        </AuthInitializer>
      </body>
    </html>
  );
}
