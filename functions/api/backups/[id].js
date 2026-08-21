import { json, errorResponse } from "../../_lib/http.js";
import { requireStagingFamily } from "../../_lib/auth.js";
import { getBackup } from "../../_lib/backup.js";

export async function onRequestGet(context) {
  const auth = requireStagingFamily(context);
  if (!auth.ok) return auth.response;
  try {
    const found = await getBackup(context.env, auth.familyId, context.params.id);
    if (!found) return json({ ok: false, error: "backup-not-found" }, 404);
    const headers = new Headers();
    found.object.writeHttpMetadata(headers);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("cache-control", "no-store");
    headers.set("x-q4b-backup-id", found.meta.id);
    headers.set("x-q4b-generation", found.meta.generation);
    headers.set("x-q4b-sha256", found.meta.sha256);
    headers.set("x-q4b-schema", found.meta.schemaVersion);
    return new Response(found.object.body, { status: 200, headers });
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    const status = /invalid-backup-id/.test(message) ? 400 : 500;
    return errorResponse(error, status);
  }
}
