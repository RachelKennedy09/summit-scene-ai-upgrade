import { renderListing, renderDetail, renderError, renderXml, TOWNS } from "../../website/render.js";
import { parsePublicFilters } from "../../utils/publicEventFilters.js";
import { eventPath } from "../../utils/eventLinks.js";

export const config = { path: ["/events", "/events/*", "/sitemap.xml", "/sitemaps/*"] };
function siteOrigin(env) {
  const value = env.PUBLIC_SITE_URL || "https://summitscene.ca";
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || url.pathname !== "/" || url.username || url.password) throw new Error("Invalid PUBLIC_SITE_URL");
  return url.origin;
}
export async function handleEvents(request, { env = process.env, fetcher = fetch } = {}) {
  const origin = siteOrigin(env);
  const url = new URL(request.url);
  const path = url.pathname;
  const headers = { "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "Cache-Control": "public, max-age=0, s-maxage=60" };
  if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" } });
  const response = (body, status = 200, extra = {}) => new Response(request.method === "HEAD" ? null : body, { status, headers: { ...headers, ...extra } });
  async function api(resource) {
    const base = env.PUBLIC_API_BASE_URL;
    if (!base) throw new Error("Set PUBLIC_API_BASE_URL for website event rendering.");
    const endpoint = new URL(base);
    if (!/^https?:$/.test(endpoint.protocol) || endpoint.username || endpoint.password) throw new Error("Invalid public API origin.");
    const res = await fetcher(`${base.replace(/\/+$/, "")}/api/public/events${resource}`, {
      signal: AbortSignal.timeout(8500), headers: { Accept: "application/json" }, redirect: "error",
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Event service unavailable.");
    return res.json();
  }
  try {
    if (path === "/sitemap.xml") {
      const data = await api("/sitemap?page=1");
      if (!data || !Number.isInteger(data.pages) || data.pages < 0 || data.pages > 49999) throw new Error("Invalid sitemap.");
      return response(renderXml([
        { url: `${origin}/sitemaps/pages.xml` },
        ...Array.from({ length: data.pages }, (_, index) => ({ url: `${origin}/sitemaps/events-${index + 1}.xml` })),
      ], "sitemapindex"), 200, { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=300" });
    }
    if (path === "/sitemaps/pages.xml") {
      return response(renderXml(["/", "/events", ...Object.keys(TOWNS).map((slug) => `/events/${slug}`), "/business", "/support", "/privacy", "/terms", "/safety", "/delete-account", "/community-guidelines"].map((page) => ({ url: origin + page }))), 200, { "Content-Type": "application/xml; charset=utf-8" });
    }
    const sitemap = path.match(/^\/sitemaps\/events-([1-9]\d{0,4})\.xml$/);
    if (sitemap) {
      const data = await api(`/sitemap?page=${sitemap[1]}`);
      if (!data || Number(sitemap[1]) > data.pages) return response("Not found", 404, { "X-Robots-Tag": "noindex", "Cache-Control": "no-store" });
      return response(renderXml(data.events.map((event) => ({ url: origin + eventPath(event), updatedAt: event.updatedAt }))), 200, { "Content-Type": "application/xml; charset=utf-8" });
    }
    const detail = path.match(/^\/events\/([a-f\d]{24})(?:\/([^/]+))?\/?$/i);
    if (detail) {
      const data = await api(`/${detail[1]}`);
      if (!data?.event) return response(renderError(404, origin, path), 404, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
      const canonical = eventPath(data.event);
      if (path !== canonical) return response(null, 301, { Location: canonical });
      return response(renderDetail(data.event, origin));
    }
    const listing = path.match(/^\/events(?:\/(banff|lake-louise|canmore))?\/?$/);
    if (!listing) return response(renderError(404, origin, path), 404, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
    if (path.endsWith("/")) return response(null, 301, { Location: path.slice(0, -1) + url.search });
    const query = new URLSearchParams();
    for (const key of ["town", "category", "when", "from", "to", "page"]) if (url.searchParams.has(key)) query.set(key, url.searchParams.get(key));
    if (listing[1]) query.set("town", TOWNS[listing[1]]);
    try { parsePublicFilters(Object.fromEntries(query)); }
    catch { return response(renderError(400, origin, path), 400, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }); }
    const data = await api(`?${query.toString()}`);
    if (!data || !Array.isArray(data.events) || !data.filters) throw new Error("Invalid event service response.");
    if (data.page > 1 && !data.events.length) return response(renderError(404, origin, path), 404, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
    return response(renderListing(data, url, origin));
  } catch {
    return response(renderError(503, origin, path), 503, { "Cache-Control": "no-store", "Retry-After": "60", "X-Robots-Tag": "noindex" });
  }
}
export default (request) => handleEvents(request);
