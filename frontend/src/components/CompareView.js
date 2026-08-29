import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GitCompare, Clock, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { API } from '../App';

export default function CompareView({ traces }) {
  const [slotA, setSlotA] = useState(null);
  const [slotB, setSlotB] = useState(null);
  const [summaryA, setSummaryA] = useState('');
  const [summaryB, setSummaryB] = useState('');
  const [comparison, setComparison] = useState('');
  const [loading, setLoading] = useState(false);

  const getTrace = (id) => traces.find(t => t.trace_id === id);
  const traceA = getTrace(slotA);
  const traceB = getTrace(slotB);

  useEffect(() => {
    if (!slotA || !slotB) {
      setComparison('');
      return;
    }

    const runComparison = async () => {
      try {
        setLoading(true);
        setComparison('Analyzing difference between trace profiles...');

        // Fetch summaries for both slots
        const [resA, resB] = await Promise.all([
          axios.get(`${API}/summary/${slotA}`),
          axios.get(`${API}/summary/${slotB}`)
        ]);

        setSummaryA(resA.data.summary || 'No summary available.');
        setSummaryB(resB.data.summary || 'No summary available.');

        // Fetch compare analysis
        const resCmp = await axios.post(`${API}/compare`, {
          trace_id_a: slotA,
          trace_id_b: slotB
        });

        setComparison(resCmp.data.comparison || 'No difference analysis generated.');
      } catch (err) {
        console.error("Comparison failed:", err);
        setComparison('Failed to generate trace comparison. Please check server log.');
      } finally {
        setLoading(false);
      }
    };

    runComparison();
  }, [slotA, slotB]);

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: '#f5f5f5', margin: '0 0 6px 0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>Compare Traces</h2>
        <p style={{ color: '#9ca3af', margin: 0, fontSize: '15px', lineHeight: '1.5' }}>
          Select two trace logs to inspect latency diffs and generate side-by-side AI comparisons.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '28px' }}>
        {[
          { label: 'Slot A', id: slotA, trace: traceA, summary: summaryA, setter: setSlotA, color: '#3b82f6' },
          { label: 'Slot B', id: slotB, trace: traceB, summary: summaryB, setter: setSlotB, color: '#a855f7' }
        ].map(slot => (
          <div key={slot.label} style={{
            flex: 1,
            background: '#121212',
            border: '1px solid #242424',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              color: slot.color,
              fontSize: '13px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <GitCompare size={14} />
              {slot.label}
            </div>
            
            {!slot.trace ? (
              <div style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
                Select a trace from the index below
              </div>
            ) : (
              <div>
                <div style={{ color: '#f5f5f5', fontFamily: '"JetBrains Mono", Consolas, monospace', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
                  {slot.trace.trace_id}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Duration</div>
                    <div style={{ color: '#f5f5f5', fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: '"JetBrains Mono", Consolas, monospace' }}>
                      <Clock size={14} color="#3b82f6" />
                      {slot.trace.total_duration_ms.toFixed(1)} ms
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Status</div>
                    <div style={{ 
                      color: slot.trace.has_error ? '#ef4444' : '#22c55e', 
                      fontSize: '14px', 
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {slot.trace.has_error ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                      {slot.trace.has_error ? 'ERROR' : 'OK'}
                    </div>
                  </div>
                </div>
                
                {slot.summary && (
                  <div style={{ borderTop: '1px solid #242424', paddingTop: '16px' }}>
                    <div style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>AI Profile Summary</div>
                    <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{slot.summary}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {comparison && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.02)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '28px',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)'
        }}>
          <h3 style={{
            margin: '0 0 10px 0', color: '#3b82f6', fontSize: '15px', fontWeight: '700',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            {loading ? (
              <RefreshCw size={16} style={{ animation: 'spin 1.2s linear infinite' }} />
            ) : (
              <GitCompare size={16} />
            )}
            AI Difference Analysis
          </h3>
          <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{comparison}</p>
        </div>
      )}

      <div style={{
        background: '#121212',
        border: '1px solid #242424',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #242424', background: '#121212' }}>
          <h3 style={{ margin: 0, color: '#f5f5f5', fontSize: '15px', fontWeight: '600' }}>Select Traces for Comparison</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: '#080808', borderBottom: '1px solid #242424' }}>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#6b7280' }}>TRACE ID</th>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#6b7280' }}>DURATION</th>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#6b7280' }}>STATUS</th>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textAlign: 'center' }}>SLOT A</th>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textAlign: 'center' }}>SLOT B</th>
              </tr>
            </thead>
            <tbody>
              {traces.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                    No traces available to select.
                  </td>
                </tr>
              ) : (
                traces.map((t) => (
                  <tr 
                    key={t.trace_id} 
                    style={{ borderBottom: '1px solid #242424' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.01)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td style={{ padding: '12px 20px', color: '#f5f5f5', fontFamily: '"JetBrains Mono", Consolas, monospace', fontSize: '13px' }}>
                      {t.trace_id.slice(0, 8)}...
                    </td>
                    <td style={{ padding: '12px 20px', color: '#cbd5e1', fontSize: '13px', fontFamily: '"JetBrains Mono", Consolas, monospace' }}>
                      {t.total_duration_ms.toFixed(1)} ms
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
                        background: t.has_error ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)',
                        color: t.has_error ? '#ef4444' : '#22c55e',
                        border: `1px solid ${t.has_error ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)'}`
                      }}>{t.has_error ? 'ERROR' : 'OK'}</span>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                      <button 
                        onClick={() => setSlotA(t.trace_id)} 
                        style={{ 
                          padding: '4px 12px', 
                          background: slotA === t.trace_id ? '#3b82f6' : 'transparent', 
                          color: slotA === t.trace_id ? '#fff' : '#9ca3af', 
                          border: `1px solid ${slotA === t.trace_id ? '#3b82f6' : '#242424'}`, 
                          borderRadius: '6px', 
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          transition: 'all 0.15s'
                        }}
                      >
                        A
                      </button>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                      <button 
                        onClick={() => setSlotB(t.trace_id)} 
                        style={{ 
                          padding: '4px 12px', 
                          background: slotB === t.trace_id ? '#a855f7' : 'transparent', 
                          color: slotB === t.trace_id ? '#fff' : '#9ca3af', 
                          border: `1px solid ${slotB === t.trace_id ? '#a855f7' : '#242424'}`, 
                          borderRadius: '6px', 
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          transition: 'all 0.15s'
                        }}
                      >
                        B
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

