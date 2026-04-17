import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const nowIso = new Date().toISOString();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  // 1. Stale "accepted" quests (no proof in 2h) -> back to open
  const { data: staleGigs, error: fetchErr } = await supabase
    .from("gigs")
    .select("id")
    .eq("status", "accepted")
    .lt("accepted_at", twoHoursAgo);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 });
  }

  let returnedCount = 0;
  if (staleGigs && staleGigs.length > 0) {
    const ids = staleGigs.map((g) => g.id);
    const { error: updateErr } = await supabase
      .from("gigs")
      .update({ status: "open", accepted_by: null, accepted_at: null })
      .in("id", ids);
    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 });
    }

    await supabase
      .from("transactions")
      .update({ status: "cancelled" })
      .in("gig_id", ids)
      .eq("status", "pending");

    returnedCount = ids.length;
  }

  // 2. Expired open quests (past their duration) -> mark expired
  const { data: expired, error: expErr } = await supabase
    .from("gigs")
    .select("id")
    .eq("status", "open")
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso);

  let expiredCount = 0;
  if (!expErr && expired && expired.length > 0) {
    const ids = expired.map((g) => g.id);
    await supabase.from("gigs").update({ status: "expired" }).in("id", ids);
    expiredCount = ids.length;
  }

  return new Response(
    JSON.stringify({ returned: returnedCount, expired: expiredCount }),
    { headers: { "Content-Type": "application/json" } },
  );
});
