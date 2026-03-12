/**
 * copy-prisma-client.js
 *
 * After `prisma generate`, the generated .prisma/client ends up inside
 * pnpm's content-addressable store, not in web/node_modules/.prisma/client
 * where Next.js (Turbopack) expects it.
 *
 * This script finds the generated .prisma/client relative to the resolved
 * @prisma/client package and copies it into web/node_modules/.prisma/client.
 */

const fs = require("fs");
const path = require("path");

// Resolve the real path of @prisma/client (follows pnpm symlinks)
const clientPkgJson = require.resolve("@prisma/client/package.json");
const clientDir = path.dirname(fs.realpathSync(clientPkgJson));

// .prisma/client lives as a sibling inside the same pnpm virtual node_modules
// e.g. .pnpm/@prisma+client@x.y.z_.../node_modules/.prisma/client
const src = path.resolve(clientDir, "../../.prisma/client");
const dst = path.resolve(__dirname, "../node_modules/.prisma/client");

if (!fs.existsSync(src)) {
  console.error(`[copy-prisma-client] Source not found: ${src}`);
  console.error("Trying fallback: searching up from the root node_modules...");

  // Fallback: search in root monorepo node_modules
  const rootPnpm = path.resolve(__dirname, "../../node_modules/.pnpm");
  if (fs.existsSync(rootPnpm)) {
    const dirs = fs.readdirSync(rootPnpm).filter((d) => d.startsWith("@prisma+client@"));
    for (const d of dirs) {
      const candidate = path.join(rootPnpm, d, "node_modules/.prisma/client");
      if (fs.existsSync(candidate)) {
        copyDir(candidate, dst);
        return;
      }
    }
  }
  console.error("[copy-prisma-client] Could not find .prisma/client anywhere.");
  process.exit(1);
}

copyDir(src, dst);

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true, force: true });
  console.log(`[copy-prisma-client] Copied .prisma/client`);
  console.log(`  from: ${from}`);
  console.log(`  to:   ${to}`);
}
