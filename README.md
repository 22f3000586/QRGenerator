# 🔳 QR Generator Web App (with History, Colors & Logo)

A modern QR Code Generator web application built using **Next.js + Supabase**.  
Users can generate QR codes with **custom colors**, add a **logo in the center**, download the QR as PNG, and view their **last 10 generated QRs in history**.

✅ Works permanently (data stored in Supabase)  
✅ Each device has its own history (no login needed)  
✅ Deployed-ready for Vercel

---

## ✨ Features

-  Generate QR code from **text / URL**
-  Choose **QR foreground & background colors**
-  Upload a **logo** (placed in center of QR)
-  Download QR as **PNG**
-  **History**: shows last 10 generated QRs
-  Device-wise history using unique `device_id` stored in browser
-  QR images stored in **Supabase Storage**
-  History saved in **Supabase Postgres**

---

## 🛠 Tech Stack

- **Frontend**: Next.js 16 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes (Serverless)
- **Database**: Supabase Postgres
- **Storage**: Supabase Storage Bucket (`qr-images`)
- **QR Generation**: `qrcode` (Node package)
- **Logo Processing**: `sharp`

---

