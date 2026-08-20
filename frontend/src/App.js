import { useState, useEffect } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

const CATEGORIES = [
  { key: "all", label: "All Traces", icon: "🔍" },
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
  const [searchQuery, setSearchQuery] = useState("");
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

  const allDurations = traces.map(t => t.total_duration_ms);
  const avgDurationAll = allDurations.length > 0 ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length : 0;
  const anomalyThreshold = avgDurationAll * 2;
  const isAnomaly = (t) => avgDurationAll > 0 && t.total_duration_ms >= anomalyThreshold;
  const anomalyCount = traces.filter(isAnomaly).length;

  const parseSearchQuery = (q) => {
    const text = q.toLowerCase().trim();
    const sf = { category: null, status: null, services: [], anomaly: false };
    if (!text) return sf;
    if (/(error|fail|failed|timeout|declin|denied|exception|fraud|out of stock)/.test(text)) sf.status = "ERROR";
    else if (/(ok|success|successful|healthy|passed)/.test(text)) sf.status = "OK";
    if (/(slow|slowest|anomal|lagg|latency)/.test(text)) sf.anomaly = true;
    if (/(bank|transfer|account|withdraw|funds)/.test(text)) sf.category = "banking";
    else if (/(food|order|delivery|restaurant|pizza|menu)/.test(text)) sf.category = "food";
    else if (/(retail|shop|checkout|inventory|coupon|cart|warehouse)/.test(text)) sf.category = "retail";
    const serviceMap = [
      ["payment", "payment"], ["auth", "auth"], ["notification", "notification"],
      ["delivery", "delivery"], ["restaurant", "restaurant"], ["menu", "menu"],
      ["inventory", "inventory"], ["discount", "discount"], ["coupon", "discount"],
      ["warehouse", "warehouse"], ["fraud", "fraud"], ["account", "account"], ["transfer", "transfer"]
    ];
    serviceMap.forEach(([kw, svc]) => {
      if (text.includes(kw) && !sf.services.includes(svc)) sf.services.push(svc);
    });
    return sf;
  };
  const searchFilters = parseSearchQuery(searchQuery);
  const searchActive = searchQuery.trim() !== "";

  const filteredTraces = traces.filter((t) => {
    const categoryMatch = category === "all" || t.category === category;
    const statusMatch = filter === "ALL" || (filter === "ANOMALY" ? isAnomaly(t) : (filter === "ERROR" ? t.has_error : !t.has_error));
    if (!categoryMatch || !statusMatch) return false;
    if (searchActive) {
      if (searchFilters.category && t.category !== searchFilters.category) return false;
      if (searchFilters.status && ((searchFilters.status === "ERROR") !== t.has_error)) return false;
      if (searchFilters.anomaly && !isAnomaly(t)) return false;
      if (searchFilters.services.length && !searchFilters.services.some(s => t.services.includes(s))) return false;
    }
    return true;
  });

  const maxDuration = spans.length > 0 ? Math.max(...spans.map(s => s.duration_ms)) : 1;
  const totalTraces = filteredTraces.length;
  const errorTraces = filteredTraces.filter(t => t.has_error).length;
  const errorRate = totalTraces > 0 ? ((errorTraces / totalTraces) * 100).toFixed(1) : 0;
  const avgDuration = totalTraces > 0 ? (filteredTraces.reduce((sum, t) => sum + t.total_duration_ms, 0) / totalTraces).toFixed(0) : 0;
  const slowestTrace = filteredTraces.length > 0 ? filteredTraces.reduce((a, b) => a.total_duration_ms > b.total_duration_ms ? a : b) : null;
  const rootCauseSpan = spans.find(s => s.status === "ERROR");

  const serviceStats = {};
  traces.forEach(t => {
    t.services.forEach(svc => {
      if (!serviceStats[svc]) serviceStats[svc] = { total: 0, errors: 0 };
      serviceStats[svc].total += 1;
      if (t.has_error) serviceStats[svc].errors += 1;
    });
  });
  const serviceHealth = Object.entries(serviceStats)
    .map(([name, s]) => ({ name, errorRate: ((s.errors / s.total) * 100).toFixed(0), total: s.total }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 5);

  const exampleTrace = JSON.stringify({
    spans: [
      { span_id: "abc001", trace_id: "trace-custom-" + Date.now(), parent_id: null, service_name: "api-gateway", operation_name: "POST /checkout", duration_ms: 25, status: "OK", attributes: {} },
      { span_id: "abc002", trace_id: "trace-custom-" + Date.now(), parent_id: "abc001", service_name: "payment-service", operation_name: "process_payment", duration_ms: 450, status: "ERROR", attributes: { error: "Gateway timeout" } },
      { span_id: "abc003", trace_id: "trace-custom-" + Date.now(), parent_id: "abc001", service_name: "notification-service", operation_name: "send_email", duration_ms: 30, status: "ERROR", attributes: { error: "Skipped due to payment failure" } }
    ]
  }, null, 2);

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif" }}>
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
                  const rc = result.spans.find(s => s.status === "ERROR");
                  return (
                    <div key={idx} style={{ marginBottom: "24px", border: "1px solid #1e3a5f", borderRadius: "10px", overflow: "hidden" }}>
                      <div style={{ background: "#0d2137", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#0070f3", fontWeight: "600" }}>Trace: {result.trace_id.slice(0, 16)}...</span>
                        <span style={{ color: "#8ab4d4", fontSize: "12px" }}>Analyzed at {result.timestamp}</span>
                      </div>
                      {rc && (
                        <div style={{ background: "#2d0a0a", padding: "10px 20px", borderBottom: "1px solid #5a1a1a", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>🎯</span>
                          <span style={{ color: "#ff6b6b", fontSize: "13px", fontWeight: "600" }}>Root Cause: {rc.service_name} — {rc.operation_name}</span>
                        </div>
                      )}
                      <div style={{ background: "#112240", padding: "20px" }}>
                        <h4 style={{ color: "#fff", marginBottom: "12px", marginTop: 0 }}>📊 Timeline</h4>
                        {result.spans.map((s, i) => (
                          <div key={i} style={{ marginBottom: "10px", padding: rc?.span_id === s.span_id ? "8px" : "0", background: rc?.span_id === s.span_id ? "#2d0a0a" : "transparent", borderRadius: "6px", border: rc?.span_id === s.span_id ? "1px solid #c0392b" : "none" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "13px", color: "#8ab4d4" }}>
                                {rc?.span_id === s.span_id && <span style={{ color: "#ff6b6b", marginRight: "6px" }}>🎯</span>}
                                {s.service_name} · {s.operation_name}
                              </span>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
              <div style={{ background: "#112240", padding: "20px", borderRadius: "10px", border: "1px solid #1e3a5f" }}>
                <div style={{ fontSize: "11px", color: "#8ab4d4", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Total Traces</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#fff" }}>{totalTraces}</div>
                {anomalyCount > 0 && (
                  <div style={{ fontSize: "12px", color: "#f39c12", marginTop: "6px", fontWeight: "600" }}>⚡ {anomalyCount} anomaly {anomalyCount > 1 ? "traces" : "trace"}</div>
                )}
              </div>
              <div style={{ background: "#112240", padding: "20px", borderRadius: "10px", border: `1px solid ${parseFloat(errorRate) > 50 ? "#c0392b" : "#1e3a5f"}` }}>
                <div style={{ fontSize: "11px", color: "#8ab4d4", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Error Rate</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: parseFloat(errorRate) > 50 ? "#ff6b6b" : "#69ff69" }}>{errorRate}%</div>
              </div>
              <div style={{ background: "#112240", padding: "20px", borderRadius: "10px", border: "1px solid #1e3a5f" }}>
                <div style={{ fontSize: "11px", color: "#8ab4d4", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Avg Duration</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#fff" }}>{avgDuration}<span style={{ fontSize: "14px", color: "#8ab4d4" }}>ms</span></div>
                {avgDurationAll > 0 && (
                  <div style={{ fontSize: "11px", color: "#8ab4d4", marginTop: "6px" }}>Anomaly threshold: {anomalyThreshold.toFixed(0)}ms (2x avg)</div>
                )}
              </div>
              <div style={{ background: "#112240", padding: "20px", borderRadius: "10px", border: "1px solid #1e3a5f" }}>
                <div style={{ fontSize: "11px", color: "#8ab4d4", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Slowest Trace</div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#f39c12" }}>{slowestTrace ? `${slowestTrace.total_duration_ms.toFixed(0)}ms` : "—"}</div>
                <div style={{ fontSize: "11px", color: "#8ab4d4", marginTop: "4px" }}>{slowestTrace ? slowestTrace.services[0] : ""}</div>
              </div>
            </div>
            <div style={{ background: "#112240", padding: "20px", borderRadius: "10px", border: "1px solid #1e3a5f", marginBottom: "24px" }}>
              <h3 style={{ color: "#fff", margin: "0 0 16px 0", fontSize: "15px" }}>🏥 Service Health</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {serviceHealth.map((svc, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", color: "#8ab4d4" }}>{svc.name}</span>
                      <span style={{ fontSize: "12px", color: parseInt(svc.errorRate) > 50 ? "#ff6b6b" : "#69ff69", fontWeight: "600" }}>{svc.errorRate}% errors</span>
                    </div>
                    <div style={{ background: "#0a1628", borderRadius: "4px", height: "8px" }}>
                      <div style={{ height: "8px", borderRadius: "4px", width: `${svc.errorRate}%`, background: parseInt(svc.errorRate) > 50 ? "#c0392b" : "#0070f3" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h2 style={{ color: "#fff", margin: 0 }}>{CATEGORIES.find(c => c.key === category)?.icon} {CATEGORIES.find(c => c.key === category)?.label}</h2>
                <p style={{ color: "#8ab4d4", margin: "4px 0 0", fontSize: "13px" }}>{filteredTraces.length} traces found</p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {[{ key: "ALL", label: "ALL" }, { key: "ANOMALY", label: "⚡ Anomaly" }, { key: "ERROR", label: "ERROR" }, { key: "OK", label: "OK" }].map((f) => (
                  <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: "6px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px", background: filter === f.key ? "#0070f3" : "#112240", color: filter === f.key ? "#fff" : "#8ab4d4" }}>{f.label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Natural language search — try 'show payment errors' or 'slow food traces'"
                style={{ flex: 1, padding: "10px 14px", background: "#112240", color: "#fff", border: searchActive ? "1px solid #0070f3" : "1px solid #1e3a5f", borderRadius: "6px", fontSize: "14px", outline: "none" }}
              />
              {searchActive && (
                <button onClick={() => setSearchQuery("")} style={{ padding: "9px 16px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>Clear ✕</button>
              )}
            </div>
            {searchActive && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                {searchFilters.category && <span style={chipStyle}>🏷️ category: {searchFilters.category}</span>}
                {searchFilters.status && <span style={chipStyle}>🚦 status: {searchFilters.status}</span>}
                {searchFilters.anomaly && <span style={chipStyle}>⚡ anomalies only</span>}
                {searchFilters.services.map(s => <span key={s} style={chipStyle}>🔧 service: {s}</span>)}
                {!searchFilters.category && !searchFilters.status && !searchFilters.anomaly && searchFilters.services.length === 0 && (
                  <span style={chipStyle}>🤔 no filters detected — try 'show payment errors'</span>
                )}
              </div>
            )}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "32px" }}>
              <thead>
                <tr style={{ background: "#112240" }}>
                  <th style={th}>Trace ID</th><th style={th}>Services</th><th style={th}>Spans</th><th style={th}>Duration (ms)</th><th style={th}>Anomaly</th><th style={th}>Status</th><th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTraces.map((t) => (
                  <tr key={t.trace_id} style={{ borderBottom: "1px solid #1e3a5f", background: selected?.trace_id === t.trace_id ? "#0d2137" : "transparent" }}>
                    <td style={td}>{t.trace_id.slice(0, 8)}...</td>
                    <td style={td}>{t.services.join(", ")}</td>
                    <td style={td}>{t.span_count}</td>
                    <td style={td}>{t.total_duration_ms.toFixed(1)}</td>
                    <td style={td}>{isAnomaly(t) ? (
                      <span style={{ padding: "2px 10px", borderRadius: "12px", background: "#3d2d00", color: "#f39c12", fontSize: "13px", fontWeight: "600" }}>⚡ ANOMALY</span>
                    ) : <span style={{ color: "#4a7a9b", fontSize: "12px" }}>—</span>}</td>
                    <td style={td}><span style={{ padding: "2px 10px", borderRadius: "12px", background: t.has_error ? "#3d0000" : "#003d00", color: t.has_error ? "#ff6b6b" : "#69ff69", fontSize: "13px" }}>{t.has_error ? "ERROR" : "OK"}</span></td>
                    <td style={td}><button onClick={() => handleSelect(t)} style={{ padding: "4px 12px", background: "#0070f3", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Explain</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {spans.length > 0 && (
              <div style={{ background: "#112240", padding: "24px", borderRadius: "10px", border: "1px solid #1e3a5f", marginBottom: "24px" }}>
                <h2 style={{ fontSize: "18px", marginBottom: "4px", color: "#fff" }}>📊 Trace Timeline</h2>
                {rootCauseSpan && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", background: "#2d0a0a", padding: "10px 14px", borderRadius: "6px", border: "1px solid #c0392b" }}>
                    <span>🎯</span>
                    <span style={{ color: "#ff6b6b", fontSize: "13px", fontWeight: "600" }}>Root Cause: {rootCauseSpan.service_name} — {rootCauseSpan.operation_name}</span>
                  </div>
                )}
                {spans.map((s, i) => (
                  <div key={i} style={{ marginBottom: "12px", padding: rootCauseSpan?.span_id === s.span_id ? "8px" : "0", background: rootCauseSpan?.span_id === s.span_id ? "#2d0a0a" : "transparent", borderRadius: "6px", border: rootCauseSpan?.span_id === s.span_id ? "1px solid #c0392b" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", color: "#8ab4d4" }}>
                        {rootCauseSpan?.span_id === s.span_id && <span style={{ color: "#ff6b6b", marginRight: "6px" }}>🎯</span>}
                        {s.service_name} · {s.operation_name}
                      </span>
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
                <h2 style={{ fontSize: "18px", marginBottom: "8px", color: "#fff" }}>🤖 AI Summary — <span style={{ color: "#0070f3" }}>{selected.trace_id.slice(0, 8)}...</span></h2>
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
const chipStyle = { padding: "4px 12px", borderRadius: "14px", background: "#0d2137", color: "#8ab4d4", fontSize: "12px", border: "1px solid #1e3a5f" };
