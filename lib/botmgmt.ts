// Detect bot-management / WAF products that actively block automated traffic
// at the edge. A site behind one of these will return 403/429/anti-bot challenge
// pages for our scanner regardless of what well-known files are actually
// published — so "nothing found" is misleading. We want to surface "blocked at
// edge by X" as a distinct, negative signal.

import type { FetchResult } from "./fetchers";

export type BotMgmtProduct =
  | "datadome"
  | "cloudflare"
  | "akamai"
  | "perimeterx"
  | "imperva"
  | "sucuri"
  | "unknown_waf";

export interface BotMgmtDetection {
  product: BotMgmtProduct;
  evidence: string; // human-readable evidence
}

export function detectBotManagement(homepage: FetchResult | undefined): BotMgmtDetection | null {
  if (!homepage) return null;
  const headers = homepage.headers ?? {};
  const body = homepage.body ?? "";
  const status = homepage.status ?? 0;

  // DataDome
  if (headers["x-datadome"]) {
    return {
      product: "datadome",
      evidence: `Response header x-datadome="${headers["x-datadome"]}" (status ${status})`,
    };
  }
  if (/dd=\{.*'cid'.*'hsh'/.test(body) || /datadome/i.test(body)) {
    return {
      product: "datadome",
      evidence: `Body contains DataDome challenge marker (status ${status})`,
    };
  }

  // Cloudflare bot management — only count it as blocking when there's a
  // mitigation signal, not just presence of cf-ray (most sites are on CF).
  if (headers["cf-mitigated"]) {
    return {
      product: "cloudflare",
      evidence: `cf-mitigated="${headers["cf-mitigated"]}" (status ${status})`,
    };
  }
  if (
    status === 403 &&
    headers["cf-ray"] &&
    /cloudflare/i.test(body) &&
    /(checking your browser|just a moment|attention required)/i.test(body)
  ) {
    return {
      product: "cloudflare",
      evidence: `Cloudflare 403 challenge with cf-ray=${headers["cf-ray"]}`,
    };
  }

  // PerimeterX / Human Security
  if (headers["x-px-block"] || headers["x-perimeter-x"]) {
    return {
      product: "perimeterx",
      evidence: `PerimeterX block header (status ${status})`,
    };
  }
  if (/_pxhd|px-captcha/i.test(body) && status === 403) {
    return {
      product: "perimeterx",
      evidence: `Body contains PerimeterX challenge markers (status ${status})`,
    };
  }

  // Akamai Bot Manager
  if (headers["x-akamai-transformed"] || headers["x-akamai-edgescape"]) {
    if (status >= 400) {
      return {
        product: "akamai",
        evidence: `Akamai edge headers with ${status}`,
      };
    }
  }
  if (status === 403 && /reference\s*#?\d+\.\w+/i.test(body) && /akamai/i.test(body)) {
    return { product: "akamai", evidence: `Akamai 403 reference page` };
  }

  // Imperva (formerly Incapsula)
  if (headers["x-iinfo"] || headers["x-imperva-id"]) {
    if (status >= 400) {
      return { product: "imperva", evidence: `Imperva headers with ${status}` };
    }
  }
  if (status === 403 && /incapsula|imperva/i.test(body)) {
    return { product: "imperva", evidence: `Imperva 403 challenge page` };
  }

  // Sucuri
  if (headers["x-sucuri-id"] && status >= 400) {
    return { product: "sucuri", evidence: `Sucuri headers with ${status}` };
  }

  // Generic WAF: 403 on homepage with no recognized fingerprint.
  // Only flag this if the body looks like a challenge / WAF response, not a
  // legitimate 403 page (which is rare on homepages anyway).
  if (
    status === 403 &&
    (body.includes("Please enable JS") ||
      body.includes("Please enable Cookies") ||
      /access\s+denied/i.test(body))
  ) {
    return { product: "unknown_waf", evidence: `Generic anti-bot 403 challenge (no fingerprint)` };
  }

  return null;
}

export function productName(p: BotMgmtProduct): string {
  switch (p) {
    case "datadome":
      return "DataDome";
    case "cloudflare":
      return "Cloudflare Bot Management";
    case "akamai":
      return "Akamai Bot Manager";
    case "perimeterx":
      return "PerimeterX / Human Security";
    case "imperva":
      return "Imperva";
    case "sucuri":
      return "Sucuri";
    case "unknown_waf":
      return "an unidentified WAF / anti-bot product";
  }
}
