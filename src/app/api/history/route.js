import { supabase } from "@/lib/supabaseClient";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const device_id = searchParams.get("device_id");

  if (!device_id) {
    return Response.json({ error: "device_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("qr_history")
    .select("*")
    .eq("device_id", device_id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ history: data });
}
