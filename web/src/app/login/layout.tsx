import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in with Discord to manage your servers with Caramel.",
  openGraph: {
    title: "Sign In | Caramel",
    description: "Sign in with Discord to manage your servers with Caramel.",
    images: [
      {
        url: "/caramel-logo.webp",
        width: 512,
        height: 512,
        alt: "Caramel Bot",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Sign In | Caramel",
    description: "Sign in with Discord to manage your servers with Caramel.",
    images: ["/caramel-logo.webp"],
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
