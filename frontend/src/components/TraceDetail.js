import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Clock, AlertCircle, AlertTriangle, CheckCircle2, LayoutTemplate, Cpu } from 'lucide-react';
import { API } from '../App';

export default function TraceDetail({ traceId, onClose }) {
  const [traceData, setTraceData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [incidentData, setIncidentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingIncident, setLoadingIncident] = useState(true);

  useEffect(() => {
    if (!traceId) return;
    setLoading(true);
    setLoadingSummary(true);
    setLoadingIncident(true);
    setSummary(null);
    setIncidentData(null);

    axios.get(`${API}/traces/${traceId}`)
      .then(res => setTraceData(res.data))
      .catch(err => console.error("Error fetching trace:", err))
      .finally(() => setLoading(false));

    axios.get(`${API}/summary/${traceId}`)
      .then(res => {
        if (res.data && res.data.error) {
          setSummary({ error: res.data.error });
        } else if (res.data && res.data.summary) {
          setSummary(res.data.summary);
        } else {
          setSummary(null);
        }
      })
      .catch(err => {
        console.error("Error fetching summary:", err);
        setSummary({ error: "Failed to retrieve trace summary due to a network or server error." });
      })
      .finally(() => setLoadingSummary(false));

    axios.get(`${API}/incidents/${traceId}`)
      .then(res => {
        if (res.data && res.data.incident) {
          setIncidentData(res.data);
        } else {
          setIncidentData(null);
        }
      })
      .catch(err => {
        console.error("Error fetching incident:", err);
        setIncidentData(null);
      })
      .finally(() => setLoadingIncident(false));
  }, [traceId]);

  if (!traceId) return null;

  const spans = traceData?.spans || [];
  const maxSpanDuration = spans.length > 0 ? Math.max(...spans.map(s => s.duration_ms)) : 1;
  const totalDuration = spans.reduce((sum, s) => sum + s.duration_ms, 0);
  const hasError = spans.some(s => s.status === 'ERROR');

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 40,
          transition: 'all 0.2s ease'
        }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: '640px',
        background: '#090909',
        borderLeft: '1px solid #242424',
        boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.6)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        transform: 'translateX(0)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #242424',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#090909'
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#f5f5f5', fontSize: '17px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LayoutTemplate size={18} color="#3b82f6" />
              Trace Details
            </h2>
            <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', fontFamily: '"JetBrains Mono", Consolas, monospace' }}>
              {traceId}
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer',
              padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#121212'; e.currentTarget.style.color = '#f5f5f5'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '40px', fontSize: '14px' }}>Loading trace telemetry...</div>
          ) : traceData ? (
            <div>
              {/* Header metrics card group */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
                <div style={{ flex: 1, background: '#121212', padding: '14px 16px', borderRadius: '8px', border: '1px solid #242424' }}>
                  <div style={{ color: '#6b7280', fontSize: '11px', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Duration</div>
                  <div style={{ color: '#f5f5f5', fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: '"JetBrains Mono", Consolas, monospace' }}>
                    <Clock size={14} color="#3b82f6" />
                    {totalDuration.toFixed(2)} ms
                  </div>
                </div>
                <div style={{ flex: 1, background: '#121212', padding: '14px 16px', borderRadius: '8px', border: '1px solid #242424' }}>
                  <div style={{ color: '#6b7280', fontSize: '11px', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Spans Count</div>
                  <div style={{ color: '#f5f5f5', fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: '"JetBrains Mono", Consolas, monospace' }}>
                    <Cpu size={14} color="#f59e0b" />
                    {spans.length} spans
                  </div>
                </div>
                <div style={{ flex: 1, background: '#121212', padding: '14px 16px', borderRadius: '8px', border: '1px solid #242424' }}>
                  <div style={{ color: '#6b7280', fontSize: '11px', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasError ? '#ef4444' : '#22c55e', fontSize: '16px', fontWeight: '800' }}>
                    {hasError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    {hasError ? "ERROR" : "OK"}
                  </div>
                </div>
              </div>

              {/* Incident Detected Card */}
              {!loadingIncident && incidentData && incidentData.incident && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.02)',
                  border: `1px solid ${
                    incidentData.severity === 'CRITICAL' || incidentData.severity === 'HIGH' 
                      ? 'rgba(239, 68, 68, 0.25)' 
                      : 'rgba(245, 158, 11, 0.25)'
                  }`,
                  borderRadius: '8px',
                  padding: '16px 20px',
                  marginBottom: '28px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #242424', paddingBottom: '10px' }}>
                    <div style={{
                      color: incidentData.severity === 'CRITICAL' || incidentData.severity === 'HIGH' ? '#ef4444' : '#f59e0b',
                      fontSize: '11px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <AlertTriangle size={14} />
                      {incidentData.severity} INCIDENT
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#f5f5f5' }}>
                      {incidentData.title}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ color: '#6b7280', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Likely Root Cause</div>
                      <div style={{ color: '#f5f5f5', fontSize: '13px', fontWeight: '600' }}>
                        {incidentData.root_cause.service_name}
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: '12px', fontFamily: '"JetBrains Mono", monospace' }}>
                        {incidentData.root_cause.operation_name}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#6b7280', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Why?</div>
                      <div style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.4' }}>
                        {incidentData.reason}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: '#0e0e0e',
                    border: '1px solid #242424',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ color: '#6b7280', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Evidence</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#9ca3af' }}>STATUS</span>
                        <span style={{ 
                          color: incidentData.evidence.status === 'ERROR' ? '#ef4444' : '#22c55e',
                          fontWeight: '700'
                        }}>{incidentData.evidence.status}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#9ca3af' }}>DURATION</span>
                        <span style={{ color: '#f5f5f5', fontFamily: '"JetBrains Mono", monospace' }}>
                          {incidentData.evidence.duration_ms.toFixed(1)} ms
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#9ca3af' }}>LATENCY</span>
                        <span style={{ color: '#f5f5f5', fontWeight: '600' }}>
                          {incidentData.evidence.latency_percentage}% of trace
                        </span>
                      </div>
                    </div>
                  </div>

                  {incidentData.explanation && (
                    <div>
                      <div style={{ color: '#6b7280', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>AI RCA Explanation</div>
                      <div style={{
                        background: '#0e0e0e',
                        border: '1px solid #242424',
                        borderRadius: '6px',
                        padding: '12px 14px',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        color: '#cbd5e1',
                        fontStyle: 'italic'
                      }}>
                        {incidentData.explanation}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Explanation Summary */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', color: '#3b82f6' }}>
                  🤖 AI Summary Analysis
                </h3>
                <div style={{
                  background: '#121212',
                  border: '1px solid #242424',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  lineHeight: '1.6',
                  fontSize: '14px',
                  color: '#cbd5e1'
                }}>
                  {loadingSummary ? (
                    <span style={{ color: '#6b7280', fontSize: '13px' }}>Generating explanation...</span>
                  ) : summary && typeof summary === 'object' && summary.error ? (
                    <div style={{ color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={14} />
                      <span>{summary.error}</span>
                    </div>
                  ) : summary ? (
                    summary
                  ) : (
                    <span style={{ color: '#6b7280', fontSize: '13px' }}>No explanation summary generated.</span>
                  )}
                </div>
              </div>

              {/* Span Timelines */}
              <h3 style={{ color: '#f5f5f5', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', borderBottom: '1px solid #242424', paddingBottom: '8px' }}>
                Trace Spans Execution
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {spans.map((span, i) => {
                  const isError = span.status === 'ERROR';
                  return (
                    <div key={span.span_id || i} style={{ 
                      background: '#121212', 
                      border: '1px solid #242424', 
                      borderRadius: '8px',
                      padding: '12px 16px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* Left border indicator */}
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                        background: isError ? '#ef4444' : '#3b82f6'
                      }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ color: '#f5f5f5', fontSize: '14px', fontWeight: '600' }}>{span.operation_name}</div>
                          <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>{span.service_name}</div>
                        </div>
                        <div style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: '600', fontFamily: '"JetBrains Mono", Consolas, monospace' }}>
                          {span.duration_ms.toFixed(1)} ms
                        </div>
                      </div>

                      {/* Timeline Duration visualizer */}
                      <div style={{ background: '#0B0B0B', borderRadius: '4px', height: '6px', overflow: 'hidden', marginTop: '8px' }}>
                        <div style={{ 
                          height: '100%', 
                          borderRadius: '4px', 
                          width: `${(span.duration_ms / maxSpanDuration) * 100}%`,
                          background: isError ? '#ef4444' : '#3b82f6',
                          transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                        }} />
                      </div>

                      {span.attributes && Object.keys(span.attributes).length > 0 && (
                        <div style={{ marginTop: '10px', background: '#0B0B0B', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontFamily: '"JetBrains Mono", Consolas, monospace', color: '#6b7280' }}>
                          {Object.entries(span.attributes).map(([k, v]) => (
                            <div key={k}>{k}: <span style={{ color: '#9ca3af' }}>{String(v)}</span></div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '40px', fontSize: '14px' }}>Failed to retrieve trace data.</div>
          )}
        </div>
      </div>
    </>
  );
}

