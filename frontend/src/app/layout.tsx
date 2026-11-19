import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/lib/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Volunteerhub — кожен важливий збір помітний", template: "%s · Volunteerhub" },
  description: "Українська платформа, що з'єднує волонтерів і тих, хто хоче допомогти. Чесне просування, прозорі звіти, спільнота. Донати йдуть напряму на банки організаторів.",
  openGraph: { title: "Volunteerhub", description: "Знаходьте перевірені збори, підтримуйте волонтерів і бачте результат.", locale: "uk_UA", type: "website" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#0B1A12", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className="min-h-dvh">
        <AuthProvider>
          <ToastProvider>
            <div className="flex min-h-dvh flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
