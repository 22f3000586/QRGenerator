import QRCode from "qrcode";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

function isValidHexColor(c) {
  return typeof c === "string" && /^#([0-9a-fA-F]{6})$/.test(c.trim());
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export async function POST(req) {
  try {
    const formData = await req.formData();

    const data = (formData.get("data") || "").trim();
    const format = (formData.get("format") || "png").toLowerCase();

    let fgColor = (formData.get("fgColor") || "#000000").trim();
    let bgColor = (formData.get("bgColor") || "#ffffff").trim();

    const logoFile = formData.get("logo"); // optional

    if (!data) {
      return Response.json({ error: "data is required" }, { status: 400 });
    }

    if (!isValidHexColor(fgColor)) fgColor = "#000000";
    if (!isValidHexColor(bgColor)) bgColor = "#ffffff";

    // SVG download (true vector)
    if (format === "svg") {
      const svgString = await QRCode.toString(data, {
        type: "svg",
        width: 300,
        margin: 2,
        color: {
          dark: fgColor,
          light: bgColor,
        },
      });

      return new Response(svgString, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `attachment; filename="qr.svg"`,
        },
      });
    }

    // Generate PNG base buffer
    let qrPngBuffer = await QRCode.toBuffer(data, {
      type: "png",
      width: 300,
      margin: 2,
      color: {
        dark: fgColor,
        light: bgColor,
      },
    });

    // Apply logo overlay if provided
    if (logoFile && typeof logoFile.arrayBuffer === "function") {
      const mime = logoFile.type || "";
      if (!mime.startsWith("image/")) {
        return Response.json({ error: "Logo must be an image" }, { status: 400 });
      }

      const logoArrayBuffer = await logoFile.arrayBuffer();
      const logoBuffer = Buffer.from(logoArrayBuffer);

      const resizedLogo = await sharp(logoBuffer)
        .resize(70, 70, { fit: "contain" })
        .png()
        .toBuffer();

      const { r, g, b } = hexToRgb(bgColor);

      const logoWithBg = await sharp({
        create: {
          width: 86,
          height: 86,
          channels: 4,
          background: { r, g, b, alpha: 1 },
        },
      })
        .composite([{ input: resizedLogo, gravity: "center" }])
        .png()
        .toBuffer();

      qrPngBuffer = await sharp(qrPngBuffer)
        .composite([{ input: logoWithBg, gravity: "center" }])
        .png()
        .toBuffer();
    }

    // PNG download
    if (format === "png") {
      return new Response(qrPngBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="qr.png"`,
        },
      });
    }

    // PDF download
    if (format === "pdf") {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4

      const pngImage = await pdfDoc.embedPng(qrPngBuffer);
      const dims = pngImage.scale(1);

      const maxW = 340;
      const maxH = 340;
      const scale = Math.min(maxW / dims.width, maxH / dims.height);

      const w = dims.width * scale;
      const h = dims.height * scale;

      page.drawImage(pngImage, {
        x: (595 - w) / 2,
        y: (842 - h) / 2,
        width: w,
        height: h,
      });

      const pdfBytes = await pdfDoc.save();

      return new Response(pdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="qr.pdf"`,
        },
      });
    }

    return Response.json({ error: "Invalid format" }, { status: 400 });
  } catch (err) {
    return Response.json(
      { error: err?.message || "Download failed" },
      { status: 500 }
    );
  }
}
