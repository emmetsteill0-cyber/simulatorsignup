import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json({ error: "Server function is not configured." }, 500);

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Sign in as an administrator first." }, 401);

  const adminClient = createClient(url, service);
  const { data: caller, error: profileError } = await adminClient
    .from("profiles").select("role,active").eq("id", user.id).single();
  if (profileError || caller?.role !== "admin" || caller?.active !== true)
    return json({ error: "Administrator permission required." }, 403);

  let body: { email?: string; role?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
  const email = String(body.email || "").trim().toLowerCase();
  const role = body.role === "admin" ? "admin" : "member";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { display_name: email.split("@")[0] },
  });
  if (error) return json({ error: error.message }, 400);

  // Profiles trigger defaults every invite to member; only a verified admin may set the invited role.
  const { error: updateError } = await adminClient.from("profiles")
    .update({ role, active: true }).eq("id", data.user.id);
  if (updateError) return json({ error: "Invitation was created, but role setup failed. Check the profiles table." }, 500);
  return json({ ok: true, invited: email, role });
});
