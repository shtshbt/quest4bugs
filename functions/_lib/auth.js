import { json } from "./http.js";

const FAMILY_RE = /^[A-Za-z0-9_-]{6,80}$/;

// Staging-only authentication gate. Production beta must replace this with
// real parent/family authentication where family identity is server-derived.
export function requireStagingFamily(context) {
  const env = context.env || {};
  if (env.COMMERCIAL_API_ENABLED !== "1") {
    return { ok: false, response: json({ ok: false, error: "commercial-api-disabled" }, 503) };
  }

  const expected = String(env.COMMERCIAL_STAGING_TOKEN || "");
  if (!expected) {
    return { ok: false, response: json({ ok: false, error: "staging-auth-not-configured" }, 503) };
  }

  const auth = String(context.request.headers.get("authorization") || "");
  const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!supplied || supplied !== expected) {
    return { ok: false, response: json({ ok: false, error: "unauthorized" }, 401) };
  }

  const familyId = String(context.request.headers.get("x-q4b-family") || "");
  if (!FAMILY_RE.test(familyId)) {
    return { ok: false, response: json({ ok: false, error: "invalid-staging-family" }, 400) };
  }

  return { ok: true, familyId };
}
