import type { Metadata } from "next";
import { getGlobalSeo } from "@/lib/data";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";
import ErrorCatcher from "@/components/ErrorCatcher";
import CompliancePopup from "@/components/CompliancePopup";
import StorefrontFooter from "@/components/StorefrontFooter";
import StorefrontHeader from "@/components/StorefrontHeader";

export async function generateMetadata(): Promise<Metadata> {
  const global = await getGlobalSeo();
  return {
    title: global?.defaultTitle || "Jack's E-Liquid | Premium Vape Juice",
    description: global?.defaultDescription || "Discover our premium selection of e-liquids and vape juices.",
    keywords: global?.defaultKeywords || undefined,
    icons: {
      icon: '/logo.png', // Use logo as Favicon
    }
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ErrorCatcher />
        <CartProvider>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <StorefrontHeader />
            {children}
            <StorefrontFooter />
          </div>
          <CartDrawer />
          <CompliancePopup />
        </CartProvider>
      </body>
    </html>
  );
}
