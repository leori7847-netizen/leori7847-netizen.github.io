import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const theoryRoot = join(root, "..");
const port = Number(process.env.PORT || 5173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
};

createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
  let baseRoot = root;
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === "/vault.js") {
    baseRoot = theoryRoot;
  } else if (pathname === "/theory" || pathname.startsWith("/theory/")) {
    baseRoot = theoryRoot;
    pathname = pathname.replace(/^\/theory\/?/, "/");
  }

  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  let file = join(baseRoot, safePath);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`AI exam simulator running at http://127.0.0.1:${port}/`);
  console.log(`Theory question bank available at http://127.0.0.1:${port}/theory/`);
});
