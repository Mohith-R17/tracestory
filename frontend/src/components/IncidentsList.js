import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Inbox } from 'lucide-react';
import { API } from '../App';

export default function IncidentsList({ onSelectTrace }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/incidents`)
      .then(res => {
        setIncidents(res.data || []);
      })
      .catch(err => {
        console.error("Error fetching incidents:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          background: 'rgba(220, 38, 38, 0.08)',
          color: '#dc2626',
          border: '1px solid rgba(220, 38, 38, 0.15)'
        };
      case 'HIGH':
        return {
          background: 'rgba(239, 68, 68, 0.08)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.15)'
        };
      case 'MEDIUM':
        return {
          background: 'rgba(249, 115, 22, 0.08)',
          color: '#f97316',
          border: '1px solid rgba(249, 115, 22, 0.15)'
        };
      case 'LOW':
      default:
        return {
          background: 'rgba(245, 158, 11, 0.08)',
          color: '#f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.15)'
        };
    }
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString();
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: '#f5f5f5', margin: '0 0 6px 0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>
          Detected Incidents
        </h2>
        <p style={{ color: '#9ca3af', margin: 0, fontSize: '15px', lineHeight: '1.5' }}>
          Overview of application behavior anomalies, error spikes, and significant latency bottlenecks.
        </p>
      </div>

      {loading ? (
        <div style={{ color: '#6b7280', textAlign: 'center', padding: '60px', fontSize: '14px' }}>
          Scanning database for incidents...
        </div>
      ) : incidents.length === 0 ? (
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
            background: 'rgba(34, 197, 94, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#22c55e',
            border: '1px solid #242424'
          }}>
            <Inbox size={32} />
          </div>
          <div>
            <h3 style={{ color: '#f5f5f5', margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>System Healthy</h3>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '14px', maxWidth: '400px', lineHeight: '1.5' }}>
              No incidents or latency anomalies have been detected. All ingested traces comply with thresholds.
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
            <h3 style={{ margin: 0, color: '#f5f5f5', fontSize: '15px', fontWeight: '600', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} color="#ef4444" />
              Behavior Incidents ({incidents.length})
            </h3>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: '#080808', borderBottom: '1px solid #242424' }}>
                  <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Severity</th>
                  <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trace ID</th>
                  <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Incident Problem</th>
                  <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Root Cause</th>
                  <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Duration</th>
                  <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detected At</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => {
                  const severityStyle = getSeverityStyle(inc.severity);
                  return (
                    <tr 
                      key={inc.trace_id} 
                      onClick={() => onSelectTrace(inc.trace_id)}
                      style={{ 
                        borderBottom: '1px solid #242424',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.01)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '14px 24px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '800',
                          letterSpacing: '0.5px',
                          ...severityStyle
                        }}>
                          {inc.severity}
                        </span>
                      </td>
                      <td style={{ padding: '14px 24px', color: '#3b82f6', fontFamily: '"JetBrains Mono", Consolas, monospace', fontSize: '13px', fontWeight: '600' }}>
                        {inc.trace_id.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '14px 24px', color: '#f5f5f5', fontSize: '14px', fontWeight: '500' }}>
                        {inc.title}
                      </td>
                      <td style={{ padding: '14px 24px', color: '#cbd5e1', fontSize: '13px' }}>
                        <div style={{ color: '#e5e7eb', fontWeight: '600' }}>
                          {inc.root_cause_service}
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: '11px', fontFamily: '"JetBrains Mono", monospace' }}>
                          {inc.root_cause_operation}
                        </div>
                      </td>
                      <td style={{ padding: '14px 24px', color: '#cbd5e1', fontSize: '13px', fontFamily: '"JetBrains Mono", Consolas, monospace' }}>
                        {inc.duration_ms.toFixed(1)} ms
                      </td>
                      <td style={{ padding: '14px 24px', color: '#6b7280', fontSize: '12px' }}>
                        {formatDate(inc.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
