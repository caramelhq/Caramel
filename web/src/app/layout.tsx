import type { Metadata } from "next";
import "./globals.css";
import { RootProvider } from "fumadocs-ui/provider/next";
import { SessionProvider } from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "Caramel — The Cutest Discord Bot",
  description: "A modular Discord bot built to scale. Moderation, vanity tracking, silent bans, and more.",
  icons: {
    icon: "/caramel-logo.webp",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SessionProvider>
          <RootProvider
            theme={{
              defaultTheme: "dark",
              forcedTheme: "dark",
            }}
          >
            {children}
          </RootProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
