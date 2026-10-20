// Starts the street hub and both destination apps on fixed ports.
//   hub      -> http://localhost:5173
//   tavern   -> http://localhost:5174  (gilded-minstrels)
//   studio   -> http://localhost:5175  (bedroom-studio)
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const apps = [
  { name: "hub", cwd: root, args: ["run", "dev"] },
  { name: "tavern", cwd: resolve(root, "gilded-minstrels"), args: ["run", "dev", "--", "--port", "5174", "--strictPort"] },
  { name: "studio", cwd: resolve(root, "bedroom-studio"), args: ["run", "dev", "--", "--port", "5175", "--strictPort"] },
];

const children = [];
for (const app of apps) {
  if (!existsSync(resolve(app.cwd, "node_modules"))) {
    console.warn(`[${app.name}] no node_modules in ${app.cwd} - run "npm install" there first`);
    continue;
  }
  const child = spawn("npm", app.args, { cwd: app.cwd, stdio: ["ignore", "pipe", "pipe"], env: process.env });
  const tag = (line) => `[${app.name}] ${line}`;
  child.stdout.on("data", (d) => process.stdout.write(String(d).split("\n").filter(Boolean).map(tag).join("\n") + "\n"));
  child.stderr.on("data", (d) => process.stderr.write(String(d).split("\n").filter(Boolean).map(tag).join("\n") + "\n"));
  child.on("exit", (code) => console.log(`[${app.name}] exited (${code})`));
  children.push(child);
}

const stop = () => { for (const c of children) c.kill("SIGINT"); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
console.log("city square: hub http://localhost:5173  tavern :5174  studio :5175  (ctrl-c stops all)");
