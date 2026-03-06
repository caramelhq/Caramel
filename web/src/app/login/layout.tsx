import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in with Discord to manage your servers with Caramel.",
  openGraph: {
    title: "Sign In | Caramel",
    description: "Sign in with Discord to manage your servers with Caramel.",
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
    title: "Sign In | Caramel",
    description: "Sign in with Discord to manage your servers with Caramel.",
    images: ["/og-image.png"],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
