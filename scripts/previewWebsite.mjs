import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { handleEvents } from "../netlify/functions/events.mjs";
import { sampleEvents } from "../website/fixtures.js";
import { parsePublicFilters } from "../utils/publicEventFilters.js";

const fixture = process.argv.includes("--fixture");
const port = Number(process.env.WEBSITE_PREVIEW_PORT || 4173);
const root = resolve(".website-dist");
const env = { ...process.env, PUBLIC_SITE_URL: `http://localhost:${port}`, ...(fixture ? { PUBLIC_API_BASE_URL: "https://fixtures.invalid" } : {}) };
const fakeFetch = async (url) => {
  const request = new URL(url);
  const id = request.pathname.split("/").at(-1);
  if (id === "sitemap") return Response.json({ events: sampleEvents, pages: 1 });
  if (/^[a-f\d]{24}$/.test(id)) {
    const event = sampleEvents.find((item) => item._id === id);
    return event ? Response.json({ event }) : new Response(null, { status: 404 });
  }
  const filters = parsePublicFilters(Object.fromEntries(request.searchParams));
  const events = sampleEvents.filter((event) => (!filters.town || event.town === filters.town) && (!filters.category || event.category === filters.category) && event.date >= filters.from && event.date <= filters.to);
  return Response.json({ events, page: filters.page, hasMore: false, filters });
};
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain", ".json": "application/json" };
http.createServer(async (req, res) => {
  const url = new URL(req.url, env.PUBLIC_SITE_URL);
  try {
    if (/^\/(events(?:\/|$)|sitemap\.xml$|sitemaps\/)/.test(url.pathname)) {
      const result = await handleEvents(new Request(url, { method: req.method }), { env, ...(fixture ? { fetcher: fakeFetch } : {}) });
      let body = await result.text();
      if (fixture && result.headers.get("content-type")?.includes("text/html")) body = body.replace("<body>", '<body><div style="background:#254A3B;color:white;text-align:center;padding:10px;font:14px system-ui">Local preview · sample listings, not live events.</div>');
      res.writeHead(result.status, Object.fromEntries(result.headers)); return res.end(body);
    }
    const clean = decodeURIComponent(url.pathname);
    let file = resolve(root, `.${clean === "/" ? "/index.html" : clean}`);
    if (!file.startsWith(root + sep)) { res.writeHead(404); return res.end("Not found"); }
    if (!extname(file) && !file.includes(".well-known")) file += ".html";
    const content = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" }); res.end(content);
  } catch { res.writeHead(404); res.end("Not found"); }
}).listen(port, "127.0.0.1", () => console.log(`Local ${fixture ? "fixture" : "backend"} website: http://localhost:${port}/events`));
