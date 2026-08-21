import { json, errorResponse } from "../../_lib/http.js";
import { requireStagingFamily } from "../../_lib/auth.js";
import { createBackup, listBackups } from "../../_lib/backup.js";

export async function onRequestGet(context) {
  const auth = requireStagingFamily(context);
  if (!auth.ok) return auth.response;
  try {
    const url = new URL(context.request.url);
    const backups = await listBackups(context.env, auth.familyId, url.searchParams.get("limit"));
    return json({ ok: true, backups });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost(context) {
  const auth = requireStagingFamily(context);
  if (!auth.ok) return auth.response;
  try {
    const length = Number(context.request.headers.get("content-length") || 0);
    if (length > 6 * 1024 * 1024) return json({ ok: false, error: "request-too-large" }, 413);
    const raw = await context.request.text();
    if (raw.length > 6 * 1024 * 1024) return json({ ok: false, error: "request-too-large" }, 413);
    let body;
    try { body = JSON.parse(raw); } catch (_) { return json({ ok: false, error: "invalid-json" }, 400); }
    const backup = await createBackup(context.env, auth.familyId, body);
    return json({ ok: true, backup }, 201);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    const status = /invalid|mismatch|snapshot|generation/.test(message) ? 400 : 500;
    return errorResponse(error, status);
  }
}
