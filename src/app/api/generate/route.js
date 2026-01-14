import { supabase } from "@/lib/supabaseClient";
import QRCode from "qrcode";
import sharp from "sharp";

export async function POST(req) {
  try {
    // ✅ Read multipart form-data
    const formData = await req.formData();

    const data = (formData.get("data") || "").trim();
    const device_id = (formData.get("device_id") || "").trim();

    const fgColor = (formData.get("fgColor") || "#000000").trim();
    const bgColor = (formData.get("bgColor") || "#ffffff").trim();

    const logoFile = formData.get("logo"); // can be null

    if (!device_id) {
      return Response.json({ error: "device_id is required" }, { status: 400 });
    }

    if (!data) {
      return Response.json({ error: "Data is required" }, { status: 400 });
    }

    // ✅ generate QR with colors
    let qrBuffer = await QRCode.toBuffer(data, {
      type: "png",
      width: 300,
      margin: 2,
      color: {
        dark: fgColor,
        light: bgColor,
      },
    });

    // ✅ overlay logo in center if uploaded
    if (logoFile && typeof logoFile.arrayBuffer === "function") {
      const logoArrayBuffer = await logoFile.arrayBuffer();
      const logoBuffer = Buffer.from(logoArrayBuffer);

      // Resize logo (safe size for scannability)
      const resizedLogo = await sharp(logoBuffer)
        .resize(70, 70, { fit: "contain" })
        .png()
        .toBuffer();

      // Optional: Add white background behind logo
      const logoWithBg = await sharp({
        create: {
          width: 86,
          height: 86,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .composite([{ input: resizedLogo, gravity: "center" }])
        .png()
        .toBuffer();

      // Overlay at center
      qrBuffer = await sharp(qrBuffer)
        .composite([{ input: logoWithBg, gravity: "center" }])
        .png()
        .toBuffer();
    }

    // ✅ upload final QR PNG to Supabase Storage
    const fileName = `qr_${Date.now()}_${device_id}.png`;

    const { error: uploadError } = await supabase.storage
      .from("qr-images")
      .upload(fileName, qrBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }

    // ✅ public URL
    const { data: publicData } = supabase.storage
      .from("qr-images")
      .getPublicUrl(fileName);

    const image_url = publicData.publicUrl;

    // ✅ insert history into DB
    const { error: dbError } = await supabase.from("qr_history").insert([
      { data, image_url, device_id },
    ]);

    if (dbError) {
      return Response.json({ error: dbError.message }, { status: 500 });
    }

    // ✅ keep only last 10 rows PER DEVICE
    const { data: allRows, error: rowsError } = await supabase
      .from("qr_history")
      .select("id")
      .eq("device_id", device_id)
      .order("created_at", { ascending: false });

    if (rowsError) {
      return Response.json({ error: rowsError.message }, { status: 500 });
    }

    if (allRows && allRows.length > 10) {
      const toDelete = allRows.slice(10).map((x) => x.id);

      const { error: deleteError } = await supabase
        .from("qr_history")
        .delete()
        .in("id", toDelete);

      if (deleteError) {
        return Response.json({ error: deleteError.message }, { status: 500 });
      }
    }

    return Response.json({
      success: true,
      image_url,
      data,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
