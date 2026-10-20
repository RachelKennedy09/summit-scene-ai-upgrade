import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { compareVersions, validateUpdatePolicy } from "../utils/appUpdatePolicy.js";

export function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (["--help", "--disable"].includes(arg)) options[arg.slice(2)] = true;
    else if (["--platform", "--version"].includes(arg) && args[index + 1] && !args[index + 1].startsWith("--")) options[arg.slice(2)] = args[++index];
    else throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  if (options.help) return options;
  if (!["ios", "android", "both"].includes(options.platform)) throw new Error("Choose --platform ios, android, or both.");
  if (!options.disable) compareVersions(options.version, options.version);
  if (options.disable && options.version) throw new Error("Use --disable without --version to preserve existing version settings.");
  return options;
}
export function configurationPlan(settings, options) {
  const platforms = options.platform === "both" ? ["ios", "android"] : [options.platform];
  return platforms.map((platform) => {
    const current = settings[platform];
    if (!Number.isSafeInteger(current?.revision) || current.revision < 0) throw new Error(`Invalid ${platform} policy revision. Nothing saved.`);
    const previous = validateUpdatePolicy(current.config, platform);
    const config = options.disable ? { ...previous, mandatoryEnabled: false } : {
      ...previous, minimumVersion: options.version, minimumBuild: null,
      latestVersion: compareVersions(previous.latestVersion, options.version) > 0 ? previous.latestVersion : options.version,
      latestBuild: null, mandatoryEnabled: true, storeAvailable: true,
    };
    return { platform, expectedRevision: current.revision, previous, config: validateUpdatePolicy(config, platform) };
  });
}
async function apiRequest(base, path, { token, method = "GET", body, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${base}${path}`, {
    method, signal: AbortSignal.timeout(15000), redirect: "error", cache: "no-store",
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("Sign-in failed or this account does not have admin access.");
    if (response.status === 409) throw new Error("Settings changed elsewhere. Run the command again to review the latest values.");
    throw new Error(`Request failed (${response.status}). Check the service and rerun to inspect current settings; no automatic retry was attempted.`);
  }
  return response.json();
}
export async function saveConfigurationPlan(base, plan, { token, fetchImpl = fetch, onSaved = () => {} } = {}) {
  for (const item of plan) {
    const saved = await apiRequest(base, `/api/app-version/admin/${item.platform}`, {
      token, fetchImpl, method: "PUT", body: { expectedRevision: item.expectedRevision, config: item.config },
    });
    const verified = validateUpdatePolicy(saved.config, item.platform);
    if (!Number.isSafeInteger(saved.revision) || saved.revision <= item.expectedRevision || JSON.stringify(verified) !== JSON.stringify(item.config)) {
      throw new Error(`Unexpected ${item.platform} save response. Check the live policy before continuing.`);
    }
    onSaved(item.platform, verified);
  }
}
function ask(prompt, secret = false) {
  return new Promise((resolveAnswer, reject) => {
    process.stdout.write(prompt);
    const silent = new Writable({ write(_chunk, _encoding, done) { done(); } });
    const readline = createInterface({ input: process.stdin, output: secret ? silent : process.stdout, terminal: true });
    readline.once("SIGINT", () => { readline.close(); reject(new Error("Cancelled.")); });
    readline.question("", (answer) => { readline.close(); if (secret) process.stdout.write("\n"); resolveAnswer(answer); });
  });
}
async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    console.log("Enable: npm run configure:app-updates -- --platform android --version 1.0.10\nBoth:   npm run configure:app-updates -- --platform both --version 1.0.10\nUndo:   npm run configure:app-updates -- --platform android --disable\nSigns in with your existing admin account. Previews changes and asks for confirmation before saving.");
    return;
  }
  if (!process.stdin.isTTY) throw new Error("Run this command in an interactive terminal. Password input stays hidden.");
  const baseUrl = new URL(process.env.APP_UPDATE_API_BASE_URL || "https://summit-scene-backend.onrender.com");
  if (baseUrl.protocol !== "https:" || baseUrl.username || baseUrl.password || baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash) throw new Error("APP_UPDATE_API_BASE_URL must be an HTTPS origin.");
  const base = baseUrl.origin;
  console.log(`Update service: ${base}\nYour password and session token are not saved or printed.`);
  const email = (await ask("Admin account email: ")).trim();
  let password = await ask("Admin account password (hidden): ", true);
  const login = await apiRequest(base, "/api/auth/login", { method: "POST", body: { email, password } });
  password = "";
  if (typeof login.token !== "string" || !login.token) throw new Error("The sign-in response did not contain a session token.");
  const settings = await apiRequest(base, "/api/app-version/admin", { token: login.token });
  const plan = configurationPlan(settings, options);
  for (const item of plan) console.log(`${item.platform}:\n${JSON.stringify({ before: item.previous, after: item.config }, null, 2)}`);
  if (!options.disable) console.log(`Confirm version ${options.version} is installable by ALL affected users on the selected platform(s), including a 100% Google Play production rollout. This uses version-only enforcement and clears native build floors.`);
  const phrase = `${options.disable ? "DISABLE" : "ENABLE"} ${options.platform}${options.disable ? "" : ` ${options.version}`}`;
  if ((await ask(`Type ${phrase} to save, or press Enter to cancel: `)).trim() !== phrase) { console.log("Cancelled. No update policies changed."); return; }
  console.log("Saving each platform separately. If one fails, earlier successful saves remain active.");
  await saveConfigurationPlan(base, plan, { token: login.token, onSaved: (platform) => console.log(`${platform}: saved and verified.`) });
  console.log(`Done. Public settings: ${base}/api/app-version\nThis command does not change the older Render environment settings.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error?.name === "TimeoutError" ? "Request timed out. Recheck the live policy before retrying." : error.message); process.exitCode = 1; });
}
