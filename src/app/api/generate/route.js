import { supabase } from "@/lib/supabaseClient";
import QRCode from "qrcode";
import sharp from "sharp";

function isValidHexColor(c) {
  if (typeof c !== "string") return false;
  const s = c.trim();
  return /^#([0-9a-fA-F]{6})$/.test(s);
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

// ✅ luminance + distance checks for contrast
function luminance({ r, g, b }) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function colorDistance(c1, c2) {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// ✅ Fix: if user enters "google.com", scanning opens google search.
// We convert it to "https://google.com"
function normalizeQrData(input) {
  const value = (input || "").trim();

  if (/^https?:\/\//i.test(value)) return value;

  if (/^[a-z0-9.-]+\.[a-z]{2,}([\/?#].*)?$/i.test(value)) {
    return `https://${value}`;
  }

  return value;
}

export async function POST(req) {
  try {
    const formData = await req.formData();

    const rawData = (formData.get("data") || "").trim();
    const data = normalizeQrData(rawData);

    const device_id = (formData.get("device_id") || "").trim();

    let fgColor = (formData.get("fgColor") || "#000000").trim();
    let bgColor = (formData.get("bgColor") || "#ffffff").trim();

    const logoFile = formData.get("logo"); // can be null

    if (!device_id) {
      return Response.json({ error: "device_id is required" }, { status: 400 });
    }

    if (!data) {
      return Response.json({ error: "Data is required" }, { status: 400 });
    }

    // ✅ validate colors
    if (!isValidHexColor(fgColor)) fgColor = "#000000";
    if (!isValidHexColor(bgColor)) bgColor = "#ffffff";

    // ✅ Reject low contrast combos
    const fgRgb = hexToRgb(fgColor);
    const bgRgb = hexToRgb(bgColor);

    const fgLum = luminance(fgRgb);
    const bgLum = luminance(bgRgb);

    const lumDiff = Math.abs(fgLum - bgLum);
    const dist = colorDistance(fgRgb, bgRgb);

    if (
      fgColor.toLowerCase() === bgColor.toLowerCase() ||
      lumDiff < 90 ||
      dist < 120
    ) {
      return Response.json(
        {
          error:
            "Selected QR color and background have low contrast. Choose darker QR color or lighter background.",
        },
        { status: 400 }
      );
    }

    // ✅ IMPORTANT FOR LOGO QR:
    let qrBuffer = await QRCode.toBuffer(data, {
      type: "png",
      width: 350,
      margin: 4,
      errorCorrectionLevel: "H",
      color: {
        dark: fgColor,
        light: bgColor,
      },
    });

    // ✅ If logo uploaded, validate it's an image
    if (logoFile && typeof logoFile.arrayBuffer === "function") {
      const mime = logoFile.type || "";
      if (!mime.startsWith("image/")) {
        return Response.json(
          { error: "Logo must be an image file." },
          { status: 400 }
        );
      }

      const logoArrayBuffer = await logoFile.arrayBuffer();
      const logoBuffer = Buffer.from(logoArrayBuffer);

      const resizedLogo = await sharp(logoBuffer)
        .resize(50, 50, { fit: "contain" })
        .png()
        .toBuffer();

      const { r, g, b } = hexToRgb(bgColor);

      const logoWithBg = await sharp({
        create: {
          width: 70,
          height: 70,
          channels: 4,
          background: { r, g, b, alpha: 1 },
        },
      })
        .composite([{ input: resizedLogo, gravity: "center" }])
        .png()
        .toBuffer();

      qrBuffer = await sharp(qrBuffer)
        .composite([{ input: logoWithBg, gravity: "center" }])
        .png()
        .toBuffer();
    }

    const bucket = "qr-images";
    const fileName = `qr_${Date.now()}_${device_id}.png`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, qrBuffer, {
        contentType: "image/png",
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    const image_url = publicData.publicUrl;

    const { error: dbError } = await supabase.from("qr_history").insert([
      {
        data,
        image_url,
        device_id,
      },
    ]);

    if (dbError) {
      return Response.json({ error: dbError.message }, { status: 500 });
    }

    // Keep only latest 10 entries for this device_id
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
      bucket,
      file_name: fileName,
    });
  } catch (err) {
    return Response.json(
      { error: err?.message || "Unknown server error" },
      { status: 500 }
    );
  }
}
