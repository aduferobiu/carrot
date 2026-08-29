import { supabase } from "./supabase";

/** Writes one row to admin_audit_log. Every state-changing admin route must
 * call this — NFR-A3 requires it with no exceptions. `actor` is the admin's
 * configured email rather than a foreign key, since there's a single
 * hardcoded admin account today; storing it as a plain value now (rather
 * than, say, a fixed literal) means that if the admin role structure is
 * later expanded to multiple accounts, existing log rows already carry
 * per-actor attribution and need no backfill (see AR-01's forward-
 * compatibility note). Read-only actions (viewing a list) are intentionally
 * not logged, per AR-01. */
export async function logAdminAction(params: {
  actionType: string;
  targetEntity: string;
  targetId?: string;
  beforeState?: unknown;
  afterState?: unknown;
}): Promise<void> {
  const { error } = await supabase.from("admin_audit_log").insert({
    actor: process.env.ADMIN_EMAIL ?? "admin",
    action_type: params.actionType,
    target_entity: params.targetEntity,
    target_id: params.targetId ?? null,
    before_state: params.beforeState ?? null,
    after_state: params.afterState ?? null,
  });
  if (error) {
    // The action itself already happened by the time this is called — a
    // logging failure shouldn't be silently swallowed, but it also
    // shouldn't undo or block a change that already succeeded.
    console.error("[admin] failed to write audit log:", error.message, params);
  }
}
