const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024;
const encoder = new TextEncoder();

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

function validSnapshotShape(parsed) {
  return !!parsed && typeof parsed === "object" && Array.isArray(parsed.profiles) &&
    parsed.kv && typeof parsed.kv === "object" && !Array.isArray(parsed.kv);
}

export function normalizeGeneration(value) {
  const g = String(value == null ? "0" : value);
  if (!/^\d{1,30}$/.test(g)) throw new Error("invalid-generation");
  return g;
}

export function validateSnapshot(snapshot) {
  if (typeof snapshot !== "string") throw new Error("snapshot-must-be-string");
  const bytes = encoder.encode(snapshot).byteLength;
  if (bytes < 2 || bytes > MAX_SNAPSHOT_BYTES) throw new Error("snapshot-size-invalid");
  let parsed;
  try { parsed = JSON.parse(snapshot); } catch (_) { throw new Error("snapshot-invalid-json"); }
  if (!validSnapshotShape(parsed)) throw new Error("snapshot-invalid-shape");
  return { parsed, bytes };
}

function requireBindings(env) {
  if (!env || !env.Q4B_DB || !env.Q4B_BACKUPS) throw new Error("cloud-bindings-not-configured");
}

export async function createBackup(env, familyId, body) {
  requireBindings(env);
  const snapshot = body && body.snapshot;
  const { bytes } = validateSnapshot(snapshot);
  const generation = normalizeGeneration(body && body.generation);
  const schemaVersion = String((body && body.schemaVersion) || "quest4bugs.fieldnote.v2").slice(0, 120);
  const actualSha = await sha256Hex(snapshot);
  if (body && body.sha256 && String(body.sha256).toLowerCase() !== actualSha) {
    throw new Error("client-sha256-mismatch");
  }

  const createdAt = Date.now();
  const clientCreatedAt = Number(body && body.clientCreatedAt) || null;
  const backupId = crypto.randomUUID();
  const objectKey = `families/${familyId}/snapshots/${createdAt}-g${generation}-${backupId}.json`;

  await env.Q4B_BACKUPS.put(objectKey, snapshot, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    customMetadata: {
      familyId,
      backupId,
      generation,
      sha256: actualSha,
      schemaVersion
    }
  });

  try {
    await env.Q4B_DB.batch([
      env.Q4B_DB.prepare(
        `INSERT INTO families (id, created_at, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`
      ).bind(familyId, createdAt, createdAt),
      env.Q4B_DB.prepare(
        `INSERT INTO backup_metadata
         (id, family_id, object_key, schema_version, generation, sha256, byte_length, created_at, client_created_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready')`
      ).bind(backupId, familyId, objectKey, schemaVersion, generation, actualSha, bytes, createdAt, clientCreatedAt),
      env.Q4B_DB.prepare(
        `UPDATE families SET latest_backup_id = ?, latest_generation = ?, updated_at = ? WHERE id = ?`
      ).bind(backupId, generation, createdAt, familyId)
    ]);
  } catch (error) {
    try { await env.Q4B_BACKUPS.delete(objectKey); } catch (_) {}
    throw error;
  }

  return { id: backupId, generation, schemaVersion, sha256: actualSha, byteLength: bytes, createdAt };
}

export async function listBackups(env, familyId, limit = 20) {
  requireBindings(env);
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
  const result = await env.Q4B_DB.prepare(
    `SELECT id, schema_version AS schemaVersion, generation, sha256,
            byte_length AS byteLength, created_at AS createdAt,
            client_created_at AS clientCreatedAt, status
       FROM backup_metadata
      WHERE family_id = ? AND status = 'ready'
      ORDER BY created_at DESC LIMIT ?`
  ).bind(familyId, safeLimit).all();
  return result.results || [];
}

export async function getBackup(env, familyId, backupId) {
  requireBindings(env);
  if (!/^[0-9a-fA-F-]{20,50}$/.test(String(backupId || ""))) throw new Error("invalid-backup-id");
  const meta = await env.Q4B_DB.prepare(
    `SELECT id, object_key AS objectKey, schema_version AS schemaVersion, generation,
            sha256, byte_length AS byteLength, created_at AS createdAt
       FROM backup_metadata
      WHERE id = ? AND family_id = ? AND status = 'ready'`
  ).bind(backupId, familyId).first();
  if (!meta) return null;
  const object = await env.Q4B_BACKUPS.get(meta.objectKey);
  if (!object) throw new Error("backup-object-missing");
  return { meta, object };
}
