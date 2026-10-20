import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CATEGORY_IMAGE_FILES } from "../website/eventImages.js";

export function associationFiles(env = process.env) {
  const prefix = env.APPLE_APP_ID_PREFIX || env.APPLE_TEAM_ID;
  if (prefix && !/^[A-Z0-9]{10}$/.test(prefix)) throw new Error("APPLE_APP_ID_PREFIX / APPLE_TEAM_ID must be a 10-character Apple identifier.");
  const fingerprints = (env.ANDROID_SHA256_CERT_FINGERPRINTS || "").split(",").map((value) => value.trim().toUpperCase()).filter(Boolean);
  if (fingerprints.some((value) => !/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(value))) throw new Error("Android certificate fingerprints must be SHA-256 colon-separated hex.");
  const identifier = "com.rachellauren.summitscene";
  return {
    apple: { applinks: { apps: [], details: prefix ? [{ appID: `${prefix}.${identifier}`, paths: ["/events", "/events/*"] }] : [] } },
    android: fingerprints.length ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: identifier, sha256_cert_fingerprints: fingerprints } }] : [],
  };
}
export async function buildWebsite(env = process.env) {
  const originUrl = new URL(env.PUBLIC_SITE_URL || "https://summitscene.ca");
  if (!/^https?:$/.test(originUrl.protocol) || originUrl.pathname !== "/" || originUrl.username || originUrl.password) throw new Error("PUBLIC_SITE_URL must be an origin.");
  const origin = originUrl.origin;
  const output = resolve(".website-dist");
  await mkdir(output, { recursive: true });
  await cp(resolve("landing"), output, { recursive: true });
  // A missing generated illustration must fail the build, not ship broken URLs.
  for (const file of CATEGORY_IMAGE_FILES) await readFile(resolve(output, file));
  for (const page of ["verify-email", "verify-email-change", "reset-password"]) {
    const file = resolve(output, `${page}.html`);
    const source = await readFile(file, "utf8");
    await writeFile(file, source.replace("</head>", '<meta name="robots" content="noindex,nofollow"></head>'));
  }
  const pages = ["index", "business", "privacy", "terms", "support", "safety", "delete-account", "community-guidelines"];
  for (const page of pages) {
    const file = resolve(output, `${page}.html`);
    const source = await readFile(file, "utf8");
    const canonical = `${origin}${page === "index" ? "/" : `/${page}`}`;
    await writeFile(file, source.replace("</head>", `<link rel="canonical" href="${canonical}"><meta property="og:url" content="${canonical}"></head>`));
  }
  // Allow crawlers to see the noindex directives on authentication pages.
  await writeFile(resolve(output, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`);
  const associations = associationFiles(env);
  await mkdir(resolve(output, ".well-known"), { recursive: true });
  await writeFile(resolve(output, ".well-known/apple-app-site-association"), JSON.stringify(associations.apple));
  await writeFile(resolve(output, ".well-known/assetlinks.json"), JSON.stringify(associations.android));
  console.log("Website prepared in .website-dist. Event pages render through the Netlify Function.");
  if (!associations.apple.applinks.details.length) console.log("iOS domain verification pending: supply APPLE_APP_ID_PREFIX or APPLE_TEAM_ID.");
  if (!associations.android.length) console.log("Android domain verification pending: supply ANDROID_SHA256_CERT_FINGERPRINTS from Play App Signing.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await buildWebsite();
