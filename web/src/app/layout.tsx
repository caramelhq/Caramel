import type { Metadata } from "next";
import "./globals.css";
import { RootProvider } from "fumadocs-ui/provider/next";
import { SessionProvider } from "@/components/SessionProvider";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://caramelhq.xyz");

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Caramel — Make it simple, make it perfect.",
    template: "%s | Caramel",
  },
  description:
    "A modular Discord bot built to scale. Moderation, vanity tracking, silent bans, and more — all configurable from a web dashboard.",
  keywords: [
    "Discord bot",
    "moderation bot",
    "vanity tracker",
    "silent ban",
    "Discord moderation",
    "guild management",
  ],
  authors: [{ name: "CaramelHQ", url: "https://github.com/CaramelHQ" }],
  creator: "CaramelHQ",
  icons: {
    icon: "/caramel-logo.webp",
    apple: "/caramel-logo.webp",
  },
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Caramel",
    title: "Caramel — Make it simple, make it perfect.",
    description:
      "A modular Discord bot built to scale. Moderation, vanity tracking, silent bans, and more — all configurable from a web dashboard.",
    images: [
      {
        url: "/og-image.png",
        width: 1080,
        height: 570,
        alt: "Caramel — Make it simple, make it perfect.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Caramel — Make it simple, make it perfect.",
    description:
      "A modular Discord bot built to scale. Moderation, vanity tracking, silent bans, and more.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
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
