import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: "https://github.com/CaramelHQ/Caramel",
    nav: {
      title: (
        <span className="flex items-center gap-2">
          <img src="/caramel-logo.webp" alt="Caramel" className="w-5 h-5 rounded-full" />
          <span className="font-semibold">Caramel</span>
        </span>
      ),
      url: "/",
    },
    links: [
      {
        text: "Documentation",
        url: "/docs",
        active: "nested-url",
      },
    ],
  };
}
