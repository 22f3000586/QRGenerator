"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [logo, setLogo] = useState(null);

  const [selectedLogoSrc, setSelectedLogoSrc] = useState(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  const [activeTab, setActiveTab] = useState("Color");
  const [downloadOpen, setDownloadOpen] = useState(false);

  const getDeviceId = () => {
    if (typeof window === "undefined") return null;

    let id = localStorage.getItem("device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("device_id", id);
    }
    return id;
  };

  const fetchHistory = async () => {
    try {
      const device_id = getDeviceId();
      if (!device_id) return;

      const res = await fetch(`/api/history?device_id=${device_id}`);
      if (!res.ok) return;

      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error("History fetch failed:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const generateQR = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setQrUrl("");

    try {
      const device_id = getDeviceId();
      const formData = new FormData();

      formData.append("data", text.trim());
      if (device_id) formData.append("device_id", device_id);

      formData.append("fgColor", fgColor);
      formData.append("bgColor", bgColor);

      if (logo) formData.append("logo", logo);

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Generate failed: ${res.status}`);

      const out = await res.json();
      if (out.error) {
        alert(out.error);
        return;
      }

      setQrUrl(out.image_url);
      setText("");
      fetchHistory();
    } catch (err) {
      console.error(err);
      alert("QR generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Proper download function (PNG / SVG / PDF)
  const downloadQR = async (ext, customData) => {
    try {
      const payloadData = (customData ?? text).trim();
      if (!payloadData) {
        alert("No data found to download.");
        return;
      }

      const formData = new FormData();
      formData.append("data", payloadData);
      formData.append("format", ext);
      formData.append("fgColor", fgColor);
      formData.append("bgColor", bgColor);

      // ⚠️ SVG can't include logo cleanly; PNG/PDF will include logo
      if (logo && ext !== "svg") {
        formData.append("logo", logo);
      }

      const res = await fetch("/api/download", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const out = await res.json().catch(() => null);
        throw new Error(out?.error || "Download failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `qr.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(e.message || "Download failed");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#f5f3f8] font-sans">
      <div className="w-full max-w-5xl rounded-[40px] bg-white/70 backdrop-blur-md shadow-[0_32px_64px_-12px_rgba(109,85,162,0.15)] p-6 sm:p-10 border border-white">
        <div className="grid lg:grid-cols-12 gap-10">
          {/* LEFT PANEL */}
          <section className="lg:col-span-6">
            <h1 className="sm:text-2xl font-black text-slate-800">
              QR Generator
            </h1>

            <div className="mt-8">
              <label className="block font-bold text-slate-600 ml-1 text-sm uppercase tracking-wider">
                Enter Link or Text
              </label>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="https://yourlink.com"
                style={{ caretColor: "#6d55a2" }}
                className="w-full rounded-2xl border-none bg-white px-6 py-4 text-slate-700 shadow-inner-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-[#6d55a2]/30 transition-all outline-none"
              />
            </div>

            <div className="mt-3 border-t border-slate-100 pt-8">
              <h2 className="font-bold text-slate-800">Design</h2>

              <div className="mt-5 flex gap-2 p-1.5 bg-slate-100/50 rounded-2xl w-fit">
                {["Logo", "Color"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2 rounded-xl transition-all font-bold text-sm ${
                      activeTab === tab
                        ? "bg-white text-[#6d55a2] shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-white bg-white/50 p-6 shadow-sm">
                {activeTab === "Logo" && (
                  <>
                    {/* Predefined Logos Row */}
                    <div className="flex gap-3 overflow-x-auto pb-4">
                      {/* Clear selection */}
                      <button
                        type="button"
                        onClick={() => {
                          setLogo(null);
                          setSelectedLogoSrc(null);
                        }}
                        className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-lg bg-white hover:bg-slate-50 transition
                          ${
                            !logo
                              ? "border-2 border-[#6d55a2]"
                              : "border-2 border-dashed border-slate-200"
                          }
                        `}
                        title="Remove logo"
                      >
                        ✕
                      </button>

                      {[
                        "/logos/1.png",
                        "/logos/2.png",
                        "/logos/3.png",
                        "/logos/4.png",
                      ].map((src) => (
                        <button
                          key={src}
                          type="button"
                          onClick={async () => {
                            const res = await fetch(src);
                            const blob = await res.blob();

                            const file = new File(
                              [blob],
                              src.split("/").pop() || "logo.png",
                              {
                                type: blob.type || "image/png",
                              }
                            );

                            setLogo(file);
                            setSelectedLogoSrc(src);
                          }}
                          className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm transition
                            ${
                              selectedLogoSrc === src
                                ? "border-2 border-[#6d55a2] ring-2 ring-[#6d55a2]/20"
                                : "border border-slate-100 hover:shadow-md hover:-translate-y-0.5"
                            }
                          `}
                          title="Use this logo"
                        >
                          <img
                            src={src}
                            alt="logo"
                            className="w-9 h-9 object-contain"
                          />
                        </button>
                      ))}
                    </div>

                    <div className="mt-4">
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">
                        Custom
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setLogo(f);
                          setSelectedLogoSrc(null);
                        }}
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#f1eff7] file:text-[#6d55a2] hover:file:bg-[#e9e5f2] transition-all"
                      />
                    </div>
                  </>
                )}

                {activeTab === "Color" && (
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">
                        Pattern Color
                      </label>
                      <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-100">
                        <input
                          type="color"
                          value={fgColor}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="w-10 h-10 rounded-lg overflow-hidden border-none cursor-pointer"
                        />
                        <span className="text-sm font-mono text-slate-500 uppercase">
                          {fgColor}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">
                        Background
                      </label>
                      <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-100">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="w-10 h-10 rounded-lg overflow-hidden border-none cursor-pointer"
                        />
                        <span className="text-sm font-mono text-slate-500 uppercase">
                          {bgColor}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={generateQR}
                  disabled={loading || !text.trim()}
                  style={{ backgroundColor: "#6d55a2" }}
                  className="mt-8 w-full rounded-2xl text-white font-bold py-4 shadow-lg shadow-[#6d55a2]/20 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {loading ? "Creating..." : "Generate Code"}
                </button>
              </div>
            </div>

            {/* Recent */}
            {history.length > 0 && (
              <div className="mt-8">
                <h3 className="font-bold text-slate-700 mb-4 ml-1">Recent</h3>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {history.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedHistoryItem(item)}
                      className="flex-shrink-0 w-16 h-16 rounded-2xl border border-white bg-white shadow-sm p-1 hover:shadow-md transition cursor-pointer"
                      title="View QR details"
                    >
                      <img
                        src={item.image_url}
                        alt="qr"
                        className="w-full h-full rounded-xl object-contain"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* RIGHT PANEL (PREVIEW) */}
          <section className="lg:col-span-6 flex items-center justify-center">
            <div className="w-full max-w-[400px] aspect-square rounded-[48px] bg-gradient-to-br from-[#f8f7fb] to-white border border-white shadow-xl p-8 flex flex-col items-center justify-center relative">
              <div className="w-full aspect-square bg-white rounded-[32px] shadow-sm flex items-center justify-center p-6 mb-8">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="QR Preview"
                    className="w-full h-full object-contain animate-in fade-in zoom-in duration-300"
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-slate-400 font-bold text-sm">Waiting...</p>
                  </div>
                )}
              </div>

              <div className="w-full relative">
                <button
                  onClick={() => setDownloadOpen((s) => !s)}
                  disabled={!qrUrl}
                  className="w-full rounded-2xl bg-slate-800 text-white font-bold py-4 flex items-center justify-center gap-3 disabled:opacity-20 transition-all shadow-lg"
                >
                  Download
                  <span
                    className={`transition-transform duration-200 ${
                      downloadOpen ? "rotate-180" : ""
                    }`}
                  >
                    ▾
                  </span>
                </button>

                {downloadOpen && qrUrl && (
                  <div className="absolute bottom-full left-0 right-0 mb-3 rounded-2xl bg-white/90 backdrop-blur-md border border-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
                    {[
                      { label: "PNG Image", ext: "png" },
                      { label: "Vector SVG", ext: "svg" },
                      { label: "Print PDF", ext: "pdf" },
                    ].map((opt) => (
                      <button
                        key={opt.ext}
                        type="button"
                        onClick={() => {
                          setDownloadOpen(false);
                          downloadQR(opt.ext, (text || "").trim());
                        }}
                        className="w-full text-left px-6 py-4 font-bold text-slate-700 hover:bg-[#f1eff7] hover:text-[#6d55a2] transition border-b border-slate-50 last:border-none"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Modal */}
      {selectedHistoryItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSelectedHistoryItem(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-800">QR Details</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(selectedHistoryItem.created_at).toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHistoryItem(null)}
                className="w-10 h-10 rounded-full hover:bg-slate-200 transition font-black"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 flex justify-center">
              <img
                src={selectedHistoryItem.image_url}
                alt="Selected QR"
                className="w-48 h-48 object-contain"
              />
            </div>

            <div className="mt-5">
              <label className="text-xs font-bold text-slate-400 uppercase">
               Data
              </label>
              <p className="mt-1 font-semibold text-slate-700 break-words">
                {selectedHistoryItem.data}
              </p>
            </div>

            {/* ✅ Proper downloads */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => downloadQR("png", selectedHistoryItem.data)}
                className="rounded-2xl bg-[#6d55a2] text-white font-bold py-3 hover:opacity-95 transition"
              >
                PNG
              </button>
              <button
                type="button"
                onClick={() => downloadQR("svg", selectedHistoryItem.data)}
                className="rounded-2xl bg-slate-800 text-white font-bold py-3 hover:opacity-95 transition"
              >
                SVG
              </button>
              <button
                type="button"
                onClick={() => downloadQR("pdf", selectedHistoryItem.data)}
                className="rounded-2xl bg-slate-700 text-white font-bold py-3 hover:opacity-95 transition"
              >
                PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
