export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders
    }
  });
}

export function methodNotAllowed(allowed) {
  return json({ ok: false, error: "method-not-allowed" }, 405, { allow: allowed.join(", ") });
}

export function errorResponse(error, status = 500) {
  const message = error && error.message ? error.message : String(error || "unknown error");
  return json({ ok: false, error: message }, status);
}
