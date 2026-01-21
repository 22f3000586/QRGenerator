import { supabase } from "@/lib/supabaseClient";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const device_id = (searchParams.get("device_id") || "").trim();

    if (!device_id) {
      return Response.json({ error: "device_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("qr_history")
      .select("id, data, image_url, created_at")
      .eq("device_id", device_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ history: data || [] });
  } catch (err) {
    return Response.json(
      { error: err?.message || "Unknown server error" },
      { status: 500 }
    );
  }
}
