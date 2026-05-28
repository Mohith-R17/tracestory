import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000/api";

const CATEGORIES = [
  { key: "all", label: "All Traces", icon: "🔍" },
  { key: "general", label: "General", icon: "📦" },
  { key: "banking", label: "Banking", icon: "🏦" },
  { key: "food", label: "Food Delivery", icon: "🍕" },
  { key: "retail", label: "Retail", icon: "🛍️" },
  { key: "compare", label: "Compare", icon: "⚖️" },
  { key: "paste", label: "Paste Trace", icon: "📋" },
];

export default function App() {
  const [traces, setTraces] = useState([]);
  const [selected, setSelected] = useState(null);
  const [spans, setSpans] = useState([]);
  const [summary, setSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [category, setCategory] = useState("all");
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [summaryA, setSummaryA] = useState("");
  const [summaryB, setSummaryB] = useState("");
  const [comparison, setComparison] = useState("");
  const [pasteHistory, setPasteHistory] = useState([]);
  const [pasteRaw, setPasteRaw] = useState("");
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pasteError, setPasteError] = useState("");

  useEffect(() => {
    fetchTraces();
    const interval = setInterval(fetchTraces, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTraces = async () => {
    const res = await axios.get(`${API}/traces`);
    setTraces(res.data);
  };

  const fetchSummary = async (trace_id) => {
    setLoadingSummary(true);
    setSummary("");
    const res = await axios.get(`${API}/summary/${trace_id}`);
    setSummary(res.data.summary);
    setLoadingSummary(false);
  };

  const fetchSpans = async (trace_id) => {
    const res = await axios.get(`${API}/traces/${trace_id}`);
    setSpans(res.data.spans);
  };

  const handleSelect = (trace) => {
    setSelected(trace);
    fetchSummary(trace.trace_id);
    fetchSpans(trace.trace_id);
  };

  const handleCompareSelect = async (trace, slot) => {
    const res = await axios.get(`${API}/summary/${trace.trace_id}`);
    if (slot === "A") { setCompareA(trace); setSummaryA(res.data.summary); }
    else { setCompareB(trace); setSummaryB(res.data.summary); }
    const a = slot === "A" ? trace : compareA;
    const b = slot === "B" ? trace : compareB;
    if (a && b) {
      setComparison("Analyzing differences...");
      const cmp = await axios.post(`${API}/compare`, { trace_id_a: a.trace_id, trace_id_b: b.trace_id });
      setComparison(cmp.data.comparison);
    }
  };

  const handlePasteAnalyze = async () => {
    setPasteError("");
    setPasteLoading(true);
    try {
      const parsed = JSON.parse(pasteRaw);
      const ingestRes = await axios.post(`${API}/ingest/paste`, parsed);
      const trace_id = ingestRes.data.trace_id;
      const summaryRes = await axios.get(`${API}/summary/${trace_id}`);
      const spansRes = await axios.get(`${API}/traces/${trace_id}`);
      const newResult = {
        summary: summaryRes.data.summary,
        spans: spansRes.data.spans,
        trace_id,
        timestamp: new Date().toLocaleTimeString()
      };
      setPasteHistory(prev => [newResult, ...prev]);
      setPasteRaw("");
    } catch (e) {
      setPasteError("Invalid JSON or server error. Check your trace format.");
    }
    setPasteLoading(false);
  };

  const filteredTraces = traces.filter((t) => {
    const categoryMatch = category === "all" || t.category === category;
    const statusMatch = filter === "ALL" || (filter === "ERROR" ? t.has_error : !t.has_error);
    return categoryMatch && statusMatch;
  });

  const maxDuration = spans.length > 0 ? Math.max(...spans.map(s => s.duration_ms)) : 1;

  const exampleTrace = JSON.stringify({
    spans: [
      { span_id: "abc001", trace_id: "trace-custom-" + Date.now(), parent_id: null, service_name: "api-gateway", operation_name: "POST /checkout", duration_ms: 25, status: "OK", attributes: {} },
      { span_id: "abc002", trace_id: "trace-custom-" + Date.now(), parent_id: "abc001", service_name: "payment-service", operation_name: "process_payment", duration_ms: 450, status: "ERROR", attributes: { error: "Gateway timeout" } },
      { span_id: "abc003", trace_id: "trace-custom-" + Date.now(), parent_id: "abc001", service_name: "notification-service", operation_name: "send_email", duration_ms: 30, status: "ERROR", attributes: { error: "Skipped due to payment failure" } }
    ]
  }, null, 2);

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif" }}>

      {/* Sidebar */}
      <div style={{ width: "220px", background: "#060f1e", padding: "24px 0", flexShrink: 0, borderRight: "1px solid #1e3a5f", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #1e3a5f" }}>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#fff" }}>🔍 TraceStory</div>
          <div style={{ fontSize: "11px", color: "#8ab4d4", marginTop: "4px" }}>Observability AI</div>
        </div>
        <div style={{ padding: "16px 0", flex: 1 }}>
          {CATEGORIES.map((cat) => (
            <div key={cat.key} onClick={() => { setCategory(cat.key); }}
              style={{ padding: "10px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", background: category === cat.key ? "#112240" : "transparent", borderLeft: category === cat.key ? "3px solid #0070f3" : "3px solid transparent", color: category === cat.key ? "#fff" : "#8ab4d4", fontSize: "14px" }}>
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {cat.key !== "all" && cat.key !== "compare" && cat.key !== "paste" && (
                <span style={{ marginLeft: "auto", fontSize: "11px", background: "#1e3a5f", padding: "2px 6px", borderRadius: "10px", color: "#8ab4d4" }}>
                  {traces.filter(t => t.category === cat.key).length}
                </span>
              )}
              {cat.key === "paste" && pasteHistory.length > 0 && (
                <span style={{ marginLeft: "auto", fontSize: "11px", background: "#0070f3", padding: "2px 6px", borderRadius: "10px", color: "#fff" }}>
                  {pasteHistory.length}
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #1e3a5f" }}>
          <div style={{ fontSize: "11px", color: "#8ab4d4" }}>Auto-refresh: 10s</div>
          <div style={{ fontSize: "11px", color: "#8ab4d4", marginTop: "4px" }}>Total: {traces.length} traces</div>
          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #1e3a5f", fontSize: "11px", color: "#4a7a9b", textAlign: "center" }}>
            © 2026 Mohith R
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "32px", overflowY: "auto" }}>

        {category === "paste" ? (
          <div>
            <h2 style={{ color: "#fff", marginBottom: "8px" }}>📋 Paste Trace</h2>
            <p style={{ color: "#8ab4d4", marginBottom: "24px" }}>Paste your own trace JSON and get an instant AI summary + timeline.</p>
            <div style={{ background: "#112240", padding: "24px", borderRadius: "10px", border: "1px solid #1e3a5f", marginBottom: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ color: "#fff", fontWeight: "600" }}>Trace JSON</span>
                <button onClick={() => setPasteRaw(exampleTrace)} style={{ padding: "4px 12px", background: "#1e3a5f", color: "#8ab4d4", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Load Example</button>
              </div>
              <textarea value={pasteRaw} onChange={e => setPasteRaw(e.target.value)}
                placeholder="Paste your trace JSON here..."
                style={{ width: "100%", height: "220px", background: "#0a1628", color: "#cde", border: "1px solid #1e3a5f", borderRadius: "6px", padding: "12px", fontSize: "13px", fontFamily: "monospace", resize: "vertical", boxSizing: "border-box" }} />
              {pasteError && <p style={{ color: "#ff6b6b", fontSize: "13px", marginTop: "8px" }}>{pasteError}</p>}
              <button onClick={handlePasteAnalyze} disabled={pasteLoading || !pasteRaw.trim()}
                style={{ marginTop: "12px", padding: "10px 28px", background: pasteLoading ? "#1e3a5f" : "#0070f3", color: "#fff", border: "none", borderRadius: "6px", cursor: pasteLoading ? "not-allowed" : "pointer", fontWeight: "600", fontSize: "14px" }}>
                {pasteLoading ? "Analyzing..." : "⚡ Analyze Trace"}
              </button>
            </div>

            {pasteHistory.length > 0 && (
              <div>
                <h3 style={{ color: "#fff", marginBottom: "16px" }}>📝 Analysis History ({pasteHistory.length})</h3>
                {pasteHistory.map((result, idx) => {
                  const maxDur = Math.max(...result.spans.map(s => s.duration_ms));
                  return (
                    <div key={idx} style={{ marginBottom: "24px", border: "1px solid #1e3a5f", borderRadius: "10px", overflow: "hidden" }}>
                      <div style={{ background: "#0d2137", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#0070f3", fontWeight: "600" }}>Trace: {result.trace_id.slice(0, 16)}...</span>
                        <span style={{ color: "#8ab4d4", fontSize: "12px" }}>Analyzed at {result.timestamp}</span>
                      </div>
                      <div style={{ background: "#112240", padding: "20px" }}>
                        <h4 style={{ color: "#fff", marginBottom: "12px", marginTop: 0 }}>📊 Timeline</h4>
                        {result.spans.map((s, i) => (
                          <div key={i} style={{ marginBottom: "10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "13px", color: "#8ab4d4" }}>{s.service_name} · {s.operation_name}</span>
                              <span style={{ fontSize: "12px", color: s.status === "ERROR" ? "#ff6b6b" : "#69ff69" }}>{s.duration_ms.toFixed(1)}ms · {s.status}</span>
                            </div>
                            <div style={{ background: "#0a1628", borderRadius: "4px", height: "10px" }}>
                              <div style={{ height: "10px", borderRadius: "4px", width: `${(s.duration_ms / maxDur) * 100}%`, background: s.status === "ERROR" ? "#c0392b" : "#0070f3" }} />
                            </div>
                          </div>
                        ))}
                        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #1e3a5f" }}>
                          <h4 style={{ color: "#fff", marginBottom: "8px", marginTop: 0 }}>🤖 AI Summary</h4>
                          <p style={{ color: "#cde", fontSize: "14px", lineHeight: "1.7", margin: 0 }}>{result.summary}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        ) : category === "compare" ? (
          <div>
            <h2 style={{ color: "#fff", marginBottom: "8px" }}>⚖️ Compare Traces</h2>
            <p style={{ color: "#8ab4d4", marginBottom: "24px" }}>Select one trace for slot A and one for slot B to compare AI summaries side by side.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
              {["A", "B"].map((slot) => (
                <div key={slot} style={{ background: "#112240", padding: "20px", borderRadius: "10px", border: "1px solid #1e3a5f" }}>
                  <div style={{ color: "#0070f3", fontWeight: "bold", marginBottom: "12px", fontSize: "16px" }}>Slot {slot}</div>
                  {(slot === "A" ? compareA : compareB) ? (
                    <div>
                      <div style={{ color: "#8ab4d4", fontSize: "13px", marginBottom: "8px" }}>
                        {(slot === "A" ? compareA : compareB).trace_id.slice(0, 8)}... · {(slot === "A" ? compareA : compareB).category}
                      </div>
                      <p style={{ color: "#cde", fontSize: "14px", lineHeight: "1.7" }}>{slot === "A" ? summaryA : summaryB}</p>
                    </div>
                  ) : (
                    <div style={{ color: "#8ab4d4", fontSize: "13px" }}>No trace selected. Pick one from the table below.</div>
                  )}
                </div>
              ))}
            </div>
            {comparison && (
              <div style={{ background: "#0d2137", padding: "20px", borderRadius: "10px", border: "1px solid #0070f3", marginBottom: "24px" }}>
                <h3 style={{ color: "#0070f3", margin: "0 0 8px 0" }}>⚡ Difference Analysis</h3>
                <p style={{ color: "#cde", fontSize: "14px", lineHeight: "1.7", margin: 0 }}>{comparison}</p>
              </div>
            )}
            <h3 style={{ color: "#fff", marginBottom: "12px" }}>Select traces to compare:</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#112240" }}>
                  <th style={th}>Trace ID</th><th style={th}>Category</th><th style={th}>Status</th><th style={th}>Duration</th><th style={th}>Slot A</th><th style={th}>Slot B</th>
                </tr>
              </thead>
              <tbody>
                {traces.map((t) => (
                  <tr key={t.trace_id} style={{ borderBottom: "1px solid #1e3a5f" }}>
                    <td style={td}>{t.trace_id.slice(0, 8)}...</td>
                    <td style={td}>{t.category}</td>
                    <td style={td}><span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "12px", background: t.has_error ? "#3d0000" : "#003d00", color: t.has_error ? "#ff6b6b" : "#69ff69" }}>{t.has_error ? "ERROR" : "OK"}</span></td>
                    <td style={td}>{t.total_duration_ms.toFixed(1)}ms</td>
                    <td style={td}><button onClick={() => handleCompareSelect(t, "A")} style={{ ...btnStyle, background: compareA?.trace_id === t.trace_id ? "#0070f3" : "#1e3a5f" }}>A</button></td>
                    <td style={td}><button onClick={() => handleCompareSelect(t, "B")} style={{ ...btnStyle, background: compareB?.trace_id === t.trace_id ? "#0070f3" : "#1e3a5f" }}>B</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h2 style={{ color: "#fff", margin: 0 }}>{CATEGORIES.find(c => c.key === category)?.icon} {CATEGORIES.find(c => c.key === category)?.label}</h2>
                <p style={{ color: "#8ab4d4", margin: "4px 0 0", fontSize: "13px" }}>{filteredTraces.length} traces found</p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {["ALL", "ERROR", "OK"].map((f) => (
                  <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px", background: filter === f ? "#0070f3" : "#112240", color: filter === f ? "#fff" : "#8ab4d4" }}>{f}</button>
                ))}
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "32px" }}>
              <thead>
                <tr style={{ background: "#112240" }}>
                  <th style={th}>Trace ID</th><th style={th}>Services</th><th style={th}>Spans</th><th style={th}>Duration (ms)</th><th style={th}>Status</th><th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTraces.map((t) => (
                  <tr key={t.trace_id} style={{ borderBottom: "1px solid #1e3a5f", background: selected?.trace_id === t.trace_id ? "#0d2137" : "transparent" }}>
                    <td style={td}>{t.trace_id.slice(0, 8)}...</td>
                    <td style={td}>{t.services.join(", ")}</td>
                    <td style={td}>{t.span_count}</td>
                    <td style={td}>{t.total_duration_ms.toFixed(1)}</td>
                    <td style={td}><span style={{ padding: "2px 10px", borderRadius: "12px", background: t.has_error ? "#3d0000" : "#003d00", color: t.has_error ? "#ff6b6b" : "#69ff69", fontSize: "13px" }}>{t.has_error ? "ERROR" : "OK"}</span></td>
                    <td style={td}><button onClick={() => handleSelect(t)} style={{ padding: "4px 12px", background: "#0070f3", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Explain</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {spans.length > 0 && (
              <div style={{ background: "#112240", padding: "24px", borderRadius: "10px", border: "1px solid #1e3a5f", marginBottom: "24px" }}>
                <h2 style={{ fontSize: "18px", marginBottom: "16px", color: "#fff" }}>📊 Trace Timeline</h2>
                {spans.map((s, i) => (
                  <div key={i} style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", color: "#8ab4d4" }}>{s.service_name} · {s.operation_name}</span>
                      <span style={{ fontSize: "12px", color: s.status === "ERROR" ? "#ff6b6b" : "#69ff69" }}>{s.duration_ms.toFixed(1)}ms · {s.status}</span>
                    </div>
                    <div style={{ background: "#0a1628", borderRadius: "4px", height: "12px" }}>
                      <div style={{ height: "12px", borderRadius: "4px", width: `${(s.duration_ms / maxDuration) * 100}%`, background: s.status === "ERROR" ? "#c0392b" : "#0070f3", transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selected && (
              <div style={{ background: "#112240", padding: "24px", borderRadius: "10px", border: "1px solid #1e3a5f" }}>
                <h2 style={{ fontSize: "18px", marginBottom: "8px", color: "#fff" }}>AI Summary — <span style={{ color: "#0070f3" }}>{selected.trace_id.slice(0, 8)}...</span></h2>
                {loadingSummary ? <p style={{ color: "#8ab4d4" }}>Generating summary...</p> : <p style={{ lineHeight: "1.7", fontSize: "15px", color: "#cde" }}>{summary}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const th = { padding: "10px 14px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#8ab4d4" };
const td = { padding: "10px 14px", fontSize: "14px", color: "#cde" };
const btnStyle = { padding: "4px 14px", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" };