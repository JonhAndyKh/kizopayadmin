import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(artifactDir, "dist", "public");
const sourceIndex = path.join(publicDir, "index.html");

const routes = [
  "admin",
  "admin/games",
  "admin/orders",
  "admin/slides",
  "admin/announcements",
  "admin/live-events",
  "admin/promos",
  "admin/products",
  "login",
  "upload",
];

for (const route of routes) {
  const routeDir = path.join(publicDir, route);
  await mkdir(routeDir, { recursive: true });
  await cp(sourceIndex, path.join(routeDir, "index.html"));
}

console.log(`Created static SPA entry points for ${routes.length} routes.`);