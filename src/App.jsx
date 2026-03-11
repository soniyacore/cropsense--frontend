import { useState, useRef, useCallback, useEffect } from "react";
import { t, LANGS } from "./i18n.js";

const API = "cropsense-backend-production.up.railway.app";

const SEVERITY_STYLE = {
  none:     { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d", dot: "#22c55e" },
  moderate: { bg: "#fffbeb", border: "#fde68a", color: "#b45309", dot: "#f59e0b" },
  high:     { bg: "#fff7ed", border: "#fed7aa", color: "#c2410c", dot: "#f97316" },
  critical: { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c", dot: "#ef4444" },
  unknown:  { bg: "#f8fafc", border: "#e2e8f0", color: "#475569", dot: "#94a3b8" },
};

// ── Severity Badge ─────────────────────────────────────────────────────────
function SeverityBadge({ severity, lang }) {
  const s = SEVERITY_STYLE[severity] || SEVERITY_STYLE.unknown;
  const label = t(lang, severity) || severity;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 99,
      background: s.bg, border: `1.5px solid ${s.border}`,
      color: s.color, fontSize: 13, fontWeight: 700,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// ── Confidence Bar ─────────────────────────────────────────────────────────
function ConfBar({ value, color }) {
  return (
    <div style={{ height: 8, background: "#e2e8f0", borderRadius: 99, overflow: "hidden", width: "100%" }}>
      <div style={{
        height: "100%", borderRadius: 99,
        width: `${value}%`,
        background: color,
        animation: "fillBar .8s ease both",
      }} />
    </div>
  );
}

// ── Camera Modal ───────────────────────────────────────────────────────────
function CameraModal({ onCapture, onClose, lang }) {
  const videoRef = useRef();
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
      .then(s => { setStream(s); if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setError(t(lang, "noCamera")));
    return () => stream?.getTracks().forEach(tr => tr.stop());
  }, []);

  const capture = () => {
    setCapturing(true);
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      stream?.getTracks().forEach(tr => tr.stop());
      onCapture(new File([blob], "capture.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, overflow: "hidden",
        width: "100%", maxWidth: 480,
        boxShadow: "0 20px 60px rgba(0,0,0,.25)",
      }}>
        {error ? (
          <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
            <p style={{ fontWeight: 600 }}>{error}</p>
            <button onClick={onClose} style={btnStyle("#ef4444", "#fff")}>{t(lang, "cancelCamera")}</button>
          </div>
        ) : (
          <>
            <div style={{ position: "relative", background: "#000" }}>
              <video ref={videoRef} autoPlay playsInline style={{ width: "100%", display: "block", maxHeight: 340, objectFit: "cover" }} />
              {/* Scan overlay */}
              <div style={{ position: "absolute", inset: 0, border: "2px solid #22c55e44", borderRadius: 4, margin: 24, pointerEvents: "none" }} />
            </div>
            <div style={{ padding: "20px 24px", display: "flex", gap: 12 }}>
              <button onClick={onClose} style={{ ...btnStyle("#f1f5f9", "#334155"), flex: 1 }}>
                {t(lang, "cancelCamera")}
              </button>
              <button onClick={capture} disabled={capturing} style={{ ...btnStyle("#22c55e", "#fff"), flex: 2 }}>
                {capturing ? t(lang, "capturing") : `📸 ${t(lang, "capture")}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function btnStyle(bg, color) {
  return {
    padding: "12px 20px", borderRadius: 12, border: "none",
    background: bg, color, fontSize: 15, fontWeight: 700,
    cursor: "pointer", transition: "opacity .15s",
  };
}

// ── Info Card ──────────────────────────────────────────────────────────────
function InfoCard({ icon, title, body, accent }) {
  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid #e2e8f0",
      borderRadius: 16,
      padding: 20,
      boxShadow: "0 2px 12px rgba(0,0,0,.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontWeight: 800, fontSize: 14, color: accent || "#166534", letterSpacing: ".02em", textTransform: "uppercase" }}>{title}</span>
      </div>
      <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#475569" }}>{body}</p>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState("en");
  const [file, setFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const setPhoto = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setPreviewURL(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    setPhoto(e.dataTransfer.files[0]);
  };

  const analyse = async () => {
    if (!file) { setError(t(lang, "errorNoFile")); return; }
    setLoading(true); setError(null); setResult(null);
    const fd = new FormData();
    fd.append("image", file);
    fd.append("lang", lang);
    try {
      const res = await fetch(`${API}/predict`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Unknown error");
      setResult(data);
    } catch (err) {
      setError(err.message.includes("fetch") ? t(lang, "errorApi") : err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFile(null); setPreviewURL(null); setResult(null); setError(null); };

  const sevStyle = result ? (SEVERITY_STYLE[result.severity] || SEVERITY_STYLE.unknown) : null;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0fdf4 0%, #f8fafc 50%, #eff6ff 100%)" }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav style={{
        background: "rgba(255,255,255,.85)", backdropFilter: "blur(12px)",
        borderBottom: "1.5px solid #e2e8f0",
        padding: "0 24px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 12px rgba(0,0,0,.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 26 }}>🌿</span>
          <span style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 22, color: "#166534" }}>
            {t(lang, "appName")}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>{t(lang, "langLabel")}:</span>
          {LANGS.map(l => (
            <button key={l.code} onClick={() => setLang(l.code)} style={{
              padding: "5px 14px", borderRadius: 20, border: "1.5px solid",
              borderColor: lang === l.code ? "#22c55e" : "#e2e8f0",
              background: lang === l.code ? "#f0fdf4" : "#fff",
              color: lang === l.code ? "#15803d" : "#64748b",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              transition: "all .15s",
            }}>{l.label}</button>
          ))}
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <header style={{ textAlign: "center", padding: "56px 24px 48px", maxWidth: 700, margin: "0 auto" }} className="fade-up">
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#f0fdf4", border: "1.5px solid #bbf7d0",
          borderRadius: 99, padding: "6px 18px", marginBottom: 20,
          fontSize: 13, fontWeight: 700, color: "#15803d",
        }}>
          <span>🤖</span> {t(lang, "tagline")}
        </div>
        <h1 style={{
          fontFamily: "'Lora', serif", fontSize: "clamp(32px, 6vw, 52px)",
          fontWeight: 600, color: "#0f172a", lineHeight: 1.2, marginBottom: 16,
        }}>
          {lang === "en" && <>Detect <span style={{ color: "#16a34a", fontStyle: "italic" }}>Crop Disease</span><br />Instantly</>}
          {lang === "ta" && <>பயிர் நோயை <span style={{ color: "#16a34a", fontStyle: "italic" }}>உடனடியாக</span><br />கண்டறியுங்கள்</>}
          {lang === "hi" && <>फसल रोग <span style={{ color: "#16a34a", fontStyle: "italic" }}>तुरंत</span><br />पहचानें</>}
        </h1>
        <p style={{ fontSize: 17, color: "#64748b", lineHeight: 1.7, maxWidth: 520, margin: "0 auto" }}>
          {t(lang, "subtitle")}
        </p>
      </header>

      {/* ── MAIN CARD ──────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "0 20px 80px" }}>

        {!result ? (
          <div style={{
            background: "#fff",
            borderRadius: 24,
            boxShadow: "0 4px 40px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04)",
            border: "1.5px solid #e2e8f0",
            overflow: "hidden",
          }} className="fade-up-2">

            {/* Upload zone */}
            {!previewURL ? (
              <div
                style={{
                  margin: 24, borderRadius: 16,
                  border: `2px dashed ${dragging ? "#22c55e" : "#d1fae5"}`,
                  background: dragging ? "#f0fdf4" : "#fafffe",
                  padding: "52px 32px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
                  cursor: "pointer", transition: "all .2s",
                }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current.click()}
              >
                <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => setPhoto(e.target.files[0])} />
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 32, boxShadow: "0 4px 16px #22c55e28",
                }}>🍃</div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontWeight: 800, fontSize: 18, color: "#0f172a", marginBottom: 4 }}>{t(lang, "uploadTitle")}</p>
                  <p style={{ color: "#64748b", fontSize: 14 }}>{t(lang, "uploadHint")}</p>
                  <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>{t(lang, "uploadSub")}</p>
                </div>
              </div>
            ) : (
              <div style={{ position: "relative", margin: 24, borderRadius: 16, overflow: "hidden" }}>
                <img src={previewURL} alt="leaf" style={{ width: "100%", maxHeight: 340, objectFit: "cover", display: "block" }} />
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  background: "linear-gradient(transparent, rgba(0,0,0,.6))",
                  padding: "32px 16px 14px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{file?.name}</span>
                  <button onClick={() => inputRef.current.click()} style={{
                    background: "rgba(255,255,255,.2)", backdropFilter: "blur(8px)",
                    border: "1.5px solid rgba(255,255,255,.4)", borderRadius: 8,
                    color: "#fff", padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700,
                  }}>{t(lang, "changePhoto")}</button>
                </div>
                <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => setPhoto(e.target.files[0])} />
              </div>
            )}

            {/* Buttons row */}
            <div style={{ display: "flex", gap: 12, padding: "0 24px 24px", flexWrap: "wrap" }}>
              <button onClick={() => setShowCamera(true)} style={{
                flex: "0 0 auto", padding: "13px 22px",
                background: "#f0fdf4", border: "1.5px solid #bbf7d0",
                borderRadius: 12, color: "#15803d", fontWeight: 700,
                fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              }}>
                📷 {t(lang, "cameraBtn")}
              </button>
              <button
                onClick={analyse}
                disabled={!file || loading}
                style={{
                  flex: 1, padding: "13px 24px",
                  background: (!file || loading) ? "#e2e8f0" : "linear-gradient(135deg, #22c55e, #16a34a)",
                  border: "none", borderRadius: 12,
                  color: (!file || loading) ? "#94a3b8" : "#fff",
                  fontWeight: 800, fontSize: 16, cursor: (!file || loading) ? "not-allowed" : "pointer",
                  boxShadow: (!file || loading) ? "none" : "0 4px 20px #22c55e44",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  transition: "all .2s",
                }}
              >
                {loading ? (
                  <>
                    <span style={{ width: 18, height: 18, border: "2.5px solid #ffffff55", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                    {t(lang, "analysing")}
                  </>
                ) : (
                  <>{previewURL ? "🔬" : "🌿"} {t(lang, "analyzeBtn")}</>
                )}
              </button>
            </div>

            {error && (
              <div style={{
                margin: "0 24px 24px", padding: "14px 18px", borderRadius: 12,
                background: "#fef2f2", border: "1.5px solid #fecaca",
                color: "#b91c1c", fontSize: 14, fontWeight: 600,
                display: "flex", gap: 8, alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                {error}
              </div>
            )}
          </div>
        ) : (
          /* ── RESULT ─────────────────────────────────────────────────── */
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-up">

            {/* Header result card */}
            <div style={{
              background: "#fff", borderRadius: 24,
              border: "1.5px solid #e2e8f0",
              boxShadow: "0 4px 40px rgba(0,0,0,.07)",
              overflow: "hidden",
            }}>
              {/* Top row: image + diagnosis */}
              <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
                {/* Image */}
                <div style={{ flex: "0 0 260px", maxWidth: "100%", position: "relative" }}>
                  <img src={previewURL} alt="analysed leaf" style={{ width: "100%", height: 260, objectFit: "cover", display: "block" }} />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(to right, transparent 60%, rgba(255,255,255,.9))",
                  }} />
                </div>
                {/* Details */}
                <div style={{ flex: 1, minWidth: 220, padding: "28px 28px 24px", display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#22c55e", letterSpacing: ".1em", textTransform: "uppercase" }}>
                    {t(lang, "resultTitle")}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 99, padding: "3px 14px", fontSize: 13, fontWeight: 700, color: "#15803d" }}>
                      🌱 {result.plant}
                    </span>
                    <SeverityBadge severity={result.severity} lang={lang} />
                  </div>
                  <h2 style={{ fontFamily: "'Lora', serif", fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 600, color: "#0f172a", lineHeight: 1.25 }}>
                    {result.disease}
                  </h2>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".08em" }}>{t(lang, "confidence")}</span>
                      <span style={{ fontSize: 22, fontWeight: 800, color: sevStyle?.color || "#166534" }}>{result.confidence}%</span>
                    </div>
                    <ConfBar value={result.confidence} color={sevStyle?.dot || "#22c55e"} />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ padding: "20px 28px", borderTop: "1.5px solid #f1f5f9", background: "#fafffe" }}>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.75 }}>
                  <strong style={{ color: "#0f172a" }}>ℹ️ {t(lang, "description")}: </strong>
                  {result.description}
                </p>
              </div>
            </div>

            {/* Treatment + Pesticide */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <InfoCard icon="💊" title={t(lang, "treatment")} body={result.treatment} accent="#15803d" />
              <InfoCard icon="🧴" title={t(lang, "pesticide")} body={result.pesticide} accent="#0369a1" />
            </div>

            {/* Top-3 alternatives */}
            <div style={{
              background: "#fff", borderRadius: 20, border: "1.5px solid #e2e8f0",
              padding: "20px 24px",
              boxShadow: "0 2px 12px rgba(0,0,0,.04)",
            }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 14 }}>
                {t(lang, "alternatives")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.top3.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      background: i === 0 ? "#f0fdf4" : "#f8fafc",
                      border: `1.5px solid ${i === 0 ? "#bbf7d0" : "#e2e8f0"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800,
                      color: i === 0 ? "#15803d" : "#64748b",
                    }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 14, color: "#334155", fontWeight: 600 }}>{item.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 100 }}>
                      <div style={{ flex: 1, height: 5, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${item.confidence}%`, background: i === 0 ? "#22c55e" : "#94a3b8", borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? "#15803d" : "#64748b", minWidth: 44, textAlign: "right" }}>
                        {item.confidence}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reset */}
            <button onClick={reset} style={{
              width: "100%", padding: "15px",
              background: "#fff", border: "1.5px solid #e2e8f0",
              borderRadius: 14, color: "#334155",
              fontWeight: 700, fontSize: 15, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,.04)",
              transition: "all .15s",
            }}>
              {t(lang, "analyseAnother")}
            </button>
          </div>
        )}
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer style={{
        textAlign: "center", padding: "24px",
        borderTop: "1.5px solid #e2e8f0",
        fontSize: 13, color: "#94a3b8", fontWeight: 600,
        background: "#fff",
      }}>
        🌿 {t(lang, "footer")}
      </footer>

      {/* ── CAMERA MODAL ───────────────────────────────────────────────── */}
      {showCamera && (
        <CameraModal
          lang={lang}
          onCapture={(f) => { setPhoto(f); setShowCamera(false); }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
