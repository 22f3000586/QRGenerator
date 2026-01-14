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


  const fetchHistory = async () => {
  const device_id = getDeviceId();
  if (!device_id) return;

  const res = await fetch(`/api/history?device_id=${device_id}`);
  const data = await res.json();
  setHistory(data.history || []);
};


  const getDeviceId = () => {
  if (typeof window === "undefined") return null;

  let id = localStorage.getItem("device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("device_id", id);
  }
  return id;
};


  useEffect(() => {
    fetchHistory();
  }, []);

  const generateQR = async () => {
  if (!text.trim()) return;

  setLoading(true);
  setQrUrl("");

  const device_id = getDeviceId();

  const formData = new FormData();
  formData.append("data", text);
  formData.append("device_id", device_id);
  formData.append("fgColor", fgColor);
  formData.append("bgColor", bgColor);

  if (logo) {
    formData.append("logo", logo);
  }

  const res = await fetch("/api/generate", {
    method: "POST",
    body: formData,
  });

  const out = await res.json();
  setLoading(false);

  if (out.error) {
    alert(out.error);
    return;
  }

  setQrUrl(out.image_url);
  setText("");
  fetchHistory();
};



  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-indigo-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
        
          <h6 className="font-extrabold tracking-tight  sm:text-2xl">
            QR Generator
          </h6>
        </header>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Generator */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
                Create New
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Content URL or Text
                  </label>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">
      QR Color
    </label>
    <input
      type="color"
      value={fgColor}
      onChange={(e) => setFgColor(e.target.value)}
      className="w-full h-12 rounded-xl border border-slate-200 bg-white"
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">
      Background
    </label>
    <input
      type="color"
      value={bgColor}
      onChange={(e) => setBgColor(e.target.value)}
      className="w-full h-12 rounded-xl border border-slate-200 bg-white"
    />
  </div>
</div>

<div>
  <label className="block text-sm font-medium text-slate-700 mb-2">
    Upload Logo (optional)
  </label>
  <input
    type="file"
    accept="image/*"
    onChange={(e) => setLogo(e.target.files?.[0] || null)}
    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3"
  />
</div>


                <button
                  onClick={generateQR}
                  disabled={loading || !text.trim()}
                  className="w-full bg-slate-900 text-white rounded-xl py-4 font-bold transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate QR Code"
                  )}
                </button>
              </div>

              {qrUrl && (
                <div className="mt-8 pt-8 border-t border-slate-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="inline-block bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <img
                      src={qrUrl}
                      alt="QR"
                      className="mx-auto w-48 h-48 rounded-lg shadow-sm"
                    />
                  </div>
                  <div className="mt-6">
                    <a
                      href={qrUrl}
                      download="qr.png"
                      className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-6 py-3 rounded-xl font-bold transition-colors hover:bg-indigo-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                      Download PNG
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Right Column: History */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-2 h-6 bg-slate-300 rounded-full"></span>
                  Recent Activity
                </h2>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Last 10 Items
                </span>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-2xl">
                  <div className="text-4xl mb-3 opacity-20">📁</div>
                  <p className="text-slate-400 font-medium">No history found</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center gap-4 bg-white border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all rounded-2xl p-4"
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={item.image_url}
                          alt="history qr"
                          className="w-14 h-14 bg-white border border-slate-200 rounded-lg p-1 group-hover:scale-110 transition-transform"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate leading-snug">
                          {item.data}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <a
                        href={item.image_url}
                        download="qr.png"
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 text-slate-700 p-2.5 rounded-xl hover:bg-slate-50 shadow-sm"
                        title="Download"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}