// Commercial-arrangement detection. Per Aaron's framing:
//   "A site that BLOCKS but has a commercial mechanism for agent access is
//    actually MORE prepared than one that's just open with no business model.
//    Legal and commercial readiness - RSL, pay-per-crawl, content licensing  - 
//    is the truest signal of agent-readiness, because it shows the site has
//    thought through both access AND disintermediation."
//
// Detection sources (any one fires the signal):
//
//   1. RSL manifest at /.well-known/rsl.xml or /rsl.xml - the open licensing
//      standard for AI training / pay-per-inference compensation.
//
//   2. HTTP 402 Payment Required on any well-known probe (pay-per-crawl,
//      Cloudflare's experiment, Tollbit, etc.) - explicit "you can have this
//      content but you pay first."
//
//   3. /licensing or /license pages that mention AI / agent / training / API
//      licensing in their content.
//
//   4. robots.txt or homepage body containing licensing-program signals
//      (Tollbit, Reuters Connect, NYT Licensing, Bloomberg API license, etc.).

import type { FetchResult } from "./fetchers";

export interface CommercialDetection {
  found: boolean;
  evidence: string[];   // human-readable list of what we found
  mechanism: string[];  // machine-readable list of detected mechanisms
}

interface Input {
  rslWellKnown?: FetchResult;
  rslRoot?: FetchResult;
  licensingPage?: FetchResult;
  licensePage?: FetchResult;
  apiLicensing?: FetchResult;
  aiLicensing?: FetchResult;
  homepage?: FetchResult;
  robotsTxt?: FetchResult;
  // Any other probes that returned 402.
  anyProbes?: FetchResult[];
}

const LICENSING_KEYWORDS = [
  "ai licens",          // AI license / AI licensing
  "training data licens",
  "training-data licens",
  "training license",
  "content licens",
  "data licens",
  "api licens",
  "machine learning licens",
  "ml licens",
  "rsl",
  "really simple licens",
  "tollbit",
  "openai licens",
  "openai partnership",
  "reuters connect",
  "nyt licens",
  "bloomberg licens",
  "pay per crawl",
  "pay-per-crawl",
  "pay per inference",
  "pay-per-inference",
];

function matchesLicensingKeywords(body: string | undefined): string[] {
  if (!body) return [];
  const lower = body.toLowerCase().slice(0, 50_000);
  const hits: string[] = [];
  for (const kw of LICENSING_KEYWORDS) {
    if (lower.includes(kw)) hits.push(kw);
  }
  return hits;
}

export function detectCommercial(input: Input): CommercialDetection {
  const evidence: string[] = [];
  const mechanism: string[] = [];

  // 1. RSL - open content licensing standard. Most authoritative signal.
  for (const r of [input.rslWellKnown, input.rslRoot]) {
    if (r?.found && r.body && r.body.length > 50) {
      const looksLikeXml = r.body.trim().startsWith("<");
      const mentionsRsl = /rsl|license|licensee|royalty/i.test(r.body);
      if (looksLikeXml || mentionsRsl) {
        evidence.push(`RSL manifest at ${r.url}`);
        mechanism.push("rsl");
        break;
      }
    }
  }

  // 2. HTTP 402 Payment Required on any probe - pay-per-crawl.
  for (const r of input.anyProbes ?? []) {
    if (r?.status === 402) {
      evidence.push(`HTTP 402 Payment Required at ${r.url}`);
      mechanism.push("pay_per_crawl");
      break;
    }
  }

  // 3. Licensing-page content that mentions AI / agent licensing.
  for (const r of [
    input.licensingPage,
    input.licensePage,
    input.apiLicensing,
    input.aiLicensing,
  ]) {
    if (r?.found && r.body) {
      const hits = matchesLicensingKeywords(r.body);
      if (hits.length > 0) {
        evidence.push(`Licensing page (${r.url}) mentions: ${hits.slice(0, 3).join(", ")}`);
        mechanism.push("licensing_page");
        break;
      }
    }
  }

  // 4. robots.txt or homepage body referencing licensing programs.
  for (const r of [input.robotsTxt, input.homepage]) {
    if (r?.body) {
      const hits = matchesLicensingKeywords(r.body);
      if (hits.length > 0) {
        evidence.push(`${r.url} mentions: ${hits.slice(0, 3).join(", ")}`);
        mechanism.push(r === input.robotsTxt ? "robots_licensing" : "homepage_licensing");
      }
    }
  }

  return {
    found: evidence.length > 0,
    evidence,
    mechanism: Array.from(new Set(mechanism)),
  };
}
