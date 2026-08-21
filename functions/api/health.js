import { json } from "../_lib/http.js";

export function onRequestGet(context) {
  return json({
    ok: true,
    service: "quest4bugs-commercial-backup",
    apiEnabled: context.env.COMMERCIAL_API_ENABLED === "1",
    bindings: {
      d1: !!context.env.Q4B_DB,
      r2: !!context.env.Q4B_BACKUPS
    }
  });
}
