# Security

## Reporting a vulnerability

If you discover a security issue in OpenAgent Registry — for example:

- a way to make the scanner fetch or return arbitrary internal content
- a server-side request forgery (SSRF) vector in the `/api/scan` endpoint
- a way to crash, hang, or amplify the service via crafted input
- a way to inject arbitrary content into stored profiles

please **open a private security advisory** on this repository:

<https://github.com/aaronkpickrell/openagent-registry/security/advisories/new>

We'll acknowledge within 7 days and aim to ship a fix within 30 days for any
confirmed issue.

## Scope

OpenAgent Registry is a public-facing scanner. The relevant security boundaries:

- **The scanner can probe any user-supplied domain.** This is intentional. But
  the scanner must only fetch a known, fixed list of well-known endpoint paths
  (defined in `lib/fetchers.ts`); any code path that lets a caller fetch an
  arbitrary path on a target is a bug.
- **Cached scan profiles must not echo executable content** (JavaScript, HTML,
  SVG with active content) into the UI. We render scan results as text-only;
  bug reports involving rendered HTML/JS from a scanned site are in scope.
- **No upstream registry credentials are used.** We treat upstream sources
  (llms-txt-hub, A2A Registry, GitHub MCP Registry) as public data only.

## Out of scope

- Bugs in our scoring rubric — those are not security issues; open a normal
  issue or PR.
- The intentional behavior of fetching public well-known files on user-supplied
  domains.
- Findings derived solely from the scanner's accurate report of a third-party
  site's anti-bot posture or licensing terms.
