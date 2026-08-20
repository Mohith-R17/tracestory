import "./App.css";

// Shared observability calculation.
// anomaly metrics + service health come from `allTraces`;
// total/error/avg/slowest metrics come from `viewTraces`.
// This mirrors the original All Traces dashboard behavior exactly.
export function computeObservability(allTraces, viewTraces) {
  const allDurations = allTraces.map(t => t.total_duration_ms);
  const avgDurationAll = allDurations.length > 0 ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length : 0;
  const anomalyThreshold = avgDurationAll * 2;
  const isAnomaly = (t) => avgDurationAll > 0 && t.total_duration_ms >= anomalyThreshold;
  const anomalyCount = allTraces.filter(isAnomaly).length;

  const totalTraces = viewTraces.length;
  const errorTraces = viewTraces.filter(t => t.has_error).length;
  const errorRate = totalTraces > 0 ? ((errorTraces / totalTraces) * 100).toFixed(1) : 0;
  const avgDuration = totalTraces > 0 ? (viewTraces.reduce((sum, t) => sum + t.total_duration_ms, 0) / totalTraces).toFixed(0) : 0;
  const slowestTrace = viewTraces.length > 0 ? viewTraces.reduce((a, b) => a.total_duration_ms > b.total_duration_ms ? a : b) : null;

  const serviceStats = {};
  allTraces.forEach(t => {
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

  return {
    avgDurationAll,
    anomalyThreshold,
    isAnomaly,
    anomalyCount,
    totalTraces,
    errorRate,
    avgDuration,
    slowestTrace,
    serviceHealth,
  };
}

// Build a trace-like object from a span list (used by the Paste Trace page).
export function traceFromSpans(spans, trace_id) {
  return {
    trace_id,
    total_duration_ms: spans.reduce((sum, s) => sum + (s.duration_ms || 0), 0),
    has_error: spans.some(s => s.status === "ERROR"),
    services: [...new Set(spans.map(s => s.service_name).filter(Boolean))],
    category: "custom",
  };
}

const cardStyle = { background: "#112240", padding: "20px", borderRadius: "10px", border: "1px solid #1e3a5f" };
const labelStyle = { fontSize: "11px", color: "#8ab4d4", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" };
const valueStyle = { fontSize: "28px", fontWeight: "bold", color: "#fff" };

export default function ObservabilityOverview({ metrics }) {
  const {
    totalTraces,
    errorRate,
    avgDuration,
    anomalyCount,
    anomalyThreshold,
    avgDurationAll,
    slowestTrace,
    serviceHealth,
  } = metrics;

  return (
    <div>
      <div className="metrics-grid">
        <div style={cardStyle}>
          <div style={labelStyle}>Total Traces</div>
          <div style={valueStyle}>{totalTraces}</div>
          {anomalyCount > 0 && (
            <div style={{ fontSize: "12px", color: "#f39c12", marginTop: "6px", fontWeight: "600" }}>
              ⚡ {anomalyCount} anomaly {anomalyCount > 1 ? "traces" : "trace"}
            </div>
          )}
        </div>
        <div style={{ ...cardStyle, border: `1px solid ${parseFloat(errorRate) > 50 ? "#c0392b" : "#1e3a5f"}` }}>
          <div style={labelStyle}>Error Rate</div>
          <div style={{ ...valueStyle, color: parseFloat(errorRate) > 50 ? "#ff6b6b" : "#69ff69" }}>{errorRate}%</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Avg Duration</div>
          <div style={valueStyle}>{avgDuration}<span style={{ fontSize: "14px", color: "#8ab4d4" }}>ms</span></div>
          {avgDurationAll > 0 && (
            <div style={{ fontSize: "11px", color: "#8ab4d4", marginTop: "6px" }}>Anomaly threshold: {anomalyThreshold.toFixed(0)}ms (2x avg)</div>
          )}
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Slowest Trace</div>
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
    </div>
  );
}