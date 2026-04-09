import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const srcRoot = path.resolve("./src");
const repoRoot = path.resolve("../..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

const resolveFilePath = (url) => {
  if (url === "/" || url === "/index.html") {
    return path.join(srcRoot, "index.html");
  }

  if (url === "/ads.txt") {
    return path.join(repoRoot, "Ads.txt");
  }

  return path.join(srcRoot, url);
};

const server = http.createServer(async (req, res) => {
  const filePath = resolveFilePath(req.url || "/");

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=300"
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

const port = process.env.PORT || 4173;
server.listen(port, () => {
  console.log(`Koschei web running on http://localhost:${port}`);
});
