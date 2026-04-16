import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  // Find accepted gigs older than 2 hours
  const { data: staleGigs, error: fetchErr } = await supabase
    .from("gigs")
    .select("id")
    .eq("status", "accepted")
    .lt("accepted_at", twoHoursAgo);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 });
  }

  if (!staleGigs || staleGigs.length === 0) {
    return new Response(JSON.stringify({ message: "No stale quests", count: 0 }));
  }

  const ids = staleGigs.map((g) => g.id);

  // Reset gigs back to open
  const { error: updateErr } = await supabase
    .from("gigs")
    .update({ status: "open", accepted_by: null, accepted_at: null })
    .in("id", ids);

  if (updateErr) {
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 });
  }

  // Cancel pending transactions
  const { error: txErr } = await supabase
    .from("transactions")
    .update({ status: "cancelled" })
    .in("gig_id", ids)
    .eq("status", "pending");

  if (txErr) {
    return new Response(JSON.stringify({ error: txErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ message: "Cancelled stale quests", count: ids.length }));
});
