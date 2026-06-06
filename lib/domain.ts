// Domain normalization shared between client and server.

export function normalizeDomain(input: string): string | null {
  if (!input) return null;
  let s = input.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split(":")[0];
  // Cheap validation: must contain a dot and only safe chars.
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(s)) return null;
  // Reject leading/trailing dashes per RFC 1035.
  if (s.startsWith("-") || s.endsWith("-")) return null;
  return s;
}
