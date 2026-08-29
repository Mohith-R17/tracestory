import React from 'react';
import MetricCard from './MetricCard';
import { Layers, AlertCircle, Clock, Activity, Inbox, Search } from 'lucide-react';

export default function AllTraces({ 
  traces, 
  filteredTraces, 
  filter, 
  setFilter, 
  onSelectTrace,
  title = "All Traces",
  description = "Overview of all telemetry data ingested into the system."
}) {
  
  // Calculate metrics
  const totalTraces = traces.length;
  const errorRate = totalTraces === 0 ? "0.0" : ((traces.filter(t => t.has_error).length / totalTraces) * 100).toFixed(1);
  const avgDuration = totalTraces === 0 ? "0.0" : (traces.reduce((sum, t) => sum + t.total_duration_ms, 0) / totalTraces).toFixed(1);
  const maxDuration = totalTraces === 0 ? "0.0" : Math.max(...traces.map(t => t.total_duration_ms)).toFixed(1);

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: '#f5f5f5', margin: '0 0 6px 0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>{title}</h2>
        <p style={{ color: '#9ca3af', margin: 0, fontSize: '15px', lineHeight: '1.5' }}>
          {description}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <MetricCard title="Total Traces" value={totalTraces} icon={Layers} color="#3b82f6" />
        <MetricCard title="Error Rate" value={errorRate} unit="%" icon={AlertCircle} color="#ef4444" />
        <MetricCard title="Avg Duration" value={avgDuration} unit="ms" icon={Clock} color="#22c55e" />
        <MetricCard title="Max Latency" value={maxDuration} unit="ms" icon={Activity} color="#f59e0b" />
      </div>

      {totalTraces === 0 ? (
        // Polished Empty State for no traces in database
        <div style={{
          background: '#121212',
          border: '1px dashed #242424',
          borderRadius: '12px',
          padding: '60px 40px',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            border: '1px solid #242424'
          }}>
            <Inbox size={32} color="#6b7280" />
          </div>
          <div>
            <h3 style={{ color: '#f5f5f5', margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>No traces yet</h3>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '14px', maxWidth: '400px', lineHeight: '1.5' }}>
              Ingest trace JSON payload via Paste Trace to start exploring your application's behavior.
            </p>
          </div>
        </div>
      ) : (
        <div style={{
          background: '#121212',
          border: '1px solid #242424',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #242424', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#121212' }}>
            <h3 style={{ margin: 0, color: '#f5f5f5', fontSize: '15px', fontWeight: '600', letterSpacing: '0.3px' }}>Recent Traces</h3>
            <div style={{ display: 'flex', gap: '6px', background: '#0B0B0B', padding: '3px', borderRadius: '6px', border: '1px solid #242424' }}>
              {["ALL", "ERROR", "OK"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                     padding: '5px 12px',
                     borderRadius: '4px',
                     border: 'none',
                     cursor: 'pointer',
                     fontWeight: '600',
                     fontSize: '11px',
                     background: filter === f ? '#242424' : 'transparent',
                     color: filter === f ? '#f5f5f5' : '#6b7280',
                     transition: 'all 0.15s ease'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: '#080808', borderBottom: '1px solid #242424' }}>
                  <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trace ID</th>
                  <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                  <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Services</th>
                  <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Spans</th>
                  <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Duration</th>
                  <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredTraces.length === 0 ? (
                  // Polished Empty State for no search results
                  <tr>
                    <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <Search size={24} color="#6b7280" />
                        <div style={{ color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>No matching traces found</div>
                        <div style={{ color: '#6b7280', fontSize: '13px' }}>Try adjusting your filters or search query.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTraces.map((t) => (
                    <tr 
                      key={t.trace_id} 
                      style={{ 
                        borderBottom: '1px solid #242424',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.01)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '14px 24px', color: '#f5f5f5', fontFamily: '"JetBrains Mono", Consolas, monospace', fontSize: '13px' }}>
                        {t.trace_id.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '14px 24px', color: '#cbd5e1', fontSize: '14px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', background: '#0B0B0B',
                          color: '#3b82f6', fontSize: '12px', border: '1px solid #242424',
                          fontWeight: '600', textTransform: 'uppercase'
                        }}>{t.category}</span>
                      </td>
                      <td style={{ padding: '14px 24px', color: '#cbd5e1', fontSize: '14px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {t.services.map((s, idx) => (
                            <span key={idx} style={{
                              padding: '2px 8px', borderRadius: '4px', background: '#0B0B0B',
                              color: '#9ca3af', fontSize: '12px', border: '1px solid #242424'
                            }}>{s}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 24px', color: '#cbd5e1', fontSize: '14px', fontWeight: '500' }}>
                        {t.span_count}
                      </td>
                      <td style={{ padding: '14px 24px', color: '#cbd5e1', fontSize: '13px', fontFamily: '"JetBrains Mono", Consolas, monospace' }}>
                        {t.total_duration_ms.toFixed(1)} ms
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: t.has_error ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)',
                            color: t.has_error ? '#ef4444' : '#22c55e',
                            border: `1px solid ${t.has_error ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)'}`
                          }}>
                            {t.has_error ? "ERROR" : "OK"}
                          </span>
                          {t.incident && (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '9px',
                              fontWeight: '800',
                              letterSpacing: '0.3px',
                              background: t.severity === 'CRITICAL' || t.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                              color: t.severity === 'CRITICAL' || t.severity === 'HIGH' ? '#ef4444' : '#f59e0b',
                              border: `1px solid ${t.severity === 'CRITICAL' || t.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'}`
                            }}>
                              INCIDENT
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                        <button
                          onClick={() => onSelectTrace(t.trace_id)}
                          style={{
                            background: '#121212',
                            color: '#9ca3af',
                            border: '1px solid #242424',
                            borderRadius: '6px',
                            padding: '6px 14px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = '#121212'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#242424'; }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

