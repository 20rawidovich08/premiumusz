// Fragment-API.uz wallet balance + capacity check for admin panel.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FRAGMENT_ENV_KEY = Deno.env.get("FRAGMENT_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // verify caller is an admin
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: rows } = await supabase.from("settings").select("key,value").in("key", ["fragment_api_key", "fragment_api_url"]);
    const cfg: Record<string, any> = {};
    (rows ?? []).forEach((r: any) => { cfg[r.key] = r.value; });
    const apiKey = String(cfg.fragment_api_key || FRAGMENT_ENV_KEY || "");
    const baseUrl = String(cfg.fragment_api_url || "https://fragment-api.uz/api/v1").replace(/\/+$/, "");
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "API kalit kiritilmagan" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const headers = { "Content-Type": "application/json", "X-API-Key": apiKey };
    const [balRes, calcRes] = await Promise.all([
      fetch(`${baseUrl}/wallet/balance`, { method: "POST", headers, body: "{}" }),
      fetch(`${baseUrl}/wallet/calculate`, { method: "POST", headers, body: "{}" }),
    ]);
    const balance = await balRes.json().catch(() => ({}));
    const capacity = await calcRes.json().catch(() => ({}));

    return new Response(JSON.stringify({
      ok: balance?.ok === true,
      balance: balance?.result || null,
      capacity: capacity?.result || null,
      error: balance?.ok ? null : (balance?.message || balance?.code || "Balansni olishda xatolik"),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
