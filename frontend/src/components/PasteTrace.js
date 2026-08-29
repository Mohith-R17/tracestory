import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, CheckCircle2, AlertCircle, Code, Eye, RefreshCw } from 'lucide-react';
import { API } from '../App';

// Safe error formatter to prevent React child object crash
function formatError(err) {
  if (!err) return "An unknown error occurred.";
  if (typeof err === "string") return err;
  
  if (err.response && err.response.data) {
    const data = err.response.data;
    if (typeof data === "string") return data;
    
    if (data.detail) {
      if (Array.isArray(data.detail)) {
        return data.detail
          .map((detailItem) => {
            if (typeof detailItem === "string") return detailItem;
            if (detailItem && typeof detailItem === "object") {
              const locStr = Array.isArray(detailItem.loc) ? detailItem.loc.filter(l => l !== "body").join(".") : "";
              const msg = detailItem.msg || "Validation error";
              return locStr ? `${locStr}: ${msg}` : msg;
            }
            return JSON.stringify(detailItem);
          })
          .join("; ");
      }
      if (typeof data.detail === "string") return data.detail;
      return JSON.stringify(data.detail);
    }
    return JSON.stringify(data);
  }
  
  if (err.message) return err.message;
  return JSON.stringify(err);
}

const EXAMPLES = {
  banking: {
    spans: [
      { span_id: "b-s1", trace_id: "req-bank-temp", parent_id: null, service_name: "auth-service", operation_name: "verify_token", duration_ms: 45, status: "OK", attributes: {} },
      { span_id: "b-s2", trace_id: "req-bank-temp", parent_id: "b-s1", service_name: "ledger-service", operation_name: "transfer_funds", duration_ms: 185, status: "OK", attributes: { currency: "USD", amount: 250 } },
      { span_id: "b-s3", trace_id: "req-bank-temp", parent_id: "b-s2", service_name: "notification-service", operation_name: "send_sms", duration_ms: 60, status: "OK", attributes: { channel: "SMS" } }
    ]
  },
  food: {
    spans: [
      { span_id: "f-s1", trace_id: "req-food-temp", parent_id: null, service_name: "checkout-service", operation_name: "place_order", duration_ms: 120, status: "OK", attributes: {} },
      { span_id: "f-s2", trace_id: "req-food-temp", parent_id: "f-s1", service_name: "restaurant-service", operation_name: "confirm_order", duration_ms: 95, status: "OK", attributes: {} },
      { span_id: "f-s3", trace_id: "req-food-temp", parent_id: "f-s1", service_name: "delivery-service", operation_name: "assign_driver", duration_ms: 210, status: "OK", attributes: { driver_id: "d-998" } }
    ]
  },
  retail: {
    spans: [
      { span_id: "r-s1", trace_id: "req-ret-temp", parent_id: null, service_name: "catalog-service", operation_name: "search_products", duration_ms: 220, status: "OK", attributes: {} },
      { span_id: "r-s2", trace_id: "req-ret-temp", parent_id: "r-s1", service_name: "inventory-service", operation_name: "check_stock", duration_ms: 85, status: "OK", attributes: {} },
      { span_id: "r-s3", trace_id: "req-ret-temp", parent_id: "r-s1", service_name: "cart-service", operation_name: "add_item", duration_ms: 45, status: "OK", attributes: {} }
    ]
  },
  general: {
    spans: [
      { span_id: "g-s1", trace_id: "req-gen-temp", parent_id: null, service_name: "web-gateway", operation_name: "GET /status", duration_ms: 30, status: "OK", attributes: {} },
      { span_id: "g-s2", trace_id: "req-gen-temp", parent_id: "g-s1", service_name: "database", operation_name: "ping", duration_ms: 15, status: "OK", attributes: {} }
    ]
  }
};

export default function PasteTrace({ onIngestSuccess, onSelectTrace }) {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastIngested, setLastIngested] = useState(null);

  const handleLoadExample = (key) => {
    const template = JSON.parse(JSON.stringify(EXAMPLES[key]));
    // Dynamically assign unique trace ID to spans
    const uniqueId = `req-${key}-${Math.floor(Math.random() * 1000000)}`;
    template.spans.forEach(s => s.trace_id = uniqueId);
    
    setJsonInput(JSON.stringify(template, null, 2));
    setStatus(null);
  };

  const handleIngest = async () => {
    try {
      setLoading(true);
      setStatus(null);
      setLastIngested(null);
      
      const parsed = JSON.parse(jsonInput);
      
      // Support both wrapped { spans: [...] } and raw [...] arrays
      let payload;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.spans) {
        payload = parsed;
      } else if (Array.isArray(parsed)) {
        payload = { spans: parsed };
      } else {
        payload = { spans: [parsed] };
      }

      const res = await axios.post(`${API}/ingest/paste`, payload);
      
      const trace_id = res.data.trace_id || (payload.spans[0] ? payload.spans[0].trace_id : null);
      const category = res.data.category || "general";
      const span_count = payload.spans.length;
      const duration = payload.spans.reduce((sum, s) => sum + (s.duration_ms || 0), 0);
      const has_error = payload.spans.some(s => s.status === "ERROR");
      
      setLastIngested({ 
        trace_id, 
        category, 
        span_count, 
        duration, 
        status: has_error ? "ERROR" : "OK" 
      });
      
      setStatus({ type: 'success', message: `Ingested ${payload.spans.length} spans successfully.` });
      setJsonInput('');
      
      if (onIngestSuccess) {
        onIngestSuccess(); // Updates trace list count in parent
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: formatError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: '#f5f5f5', margin: '0 0 6px 0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>Paste Trace</h2>
        <p style={{ color: '#9ca3af', margin: 0, fontSize: '15px', lineHeight: '1.5' }}>
          Manually ingest trace telemetry payloads. Visualize timelines and trigger AI analysis immediately.
        </p>
      </div>

      {lastIngested && (
        <div style={{
          background: '#121212',
          border: '1px solid #242424',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <CheckCircle2 size={24} color="#22c55e" />
            </div>
            <div>
              <div style={{ color: '#f5f5f5', fontWeight: '600', fontSize: '15px' }}>Trace Ingested & Classified</div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '6px', fontSize: '13px', color: '#9ca3af' }}>
                <span>ID: <span style={{ fontFamily: 'monospace', color: '#f5f5f5' }}>{lastIngested.trace_id.slice(0, 8)}...</span></span>
                <span style={{ color: '#242424' }}>|</span>
                <span>Category: <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#0B0B0B', border: '1px solid #242424', color: '#3b82f6', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>{lastIngested.category}</span></span>
                <span style={{ color: '#242424' }}>|</span>
                <span>Spans: <span style={{ color: '#f5f5f5', fontWeight: '600' }}>{lastIngested.span_count}</span></span>
                <span style={{ color: '#242424' }}>|</span>
                <span>Duration: <span style={{ color: '#f5f5f5', fontWeight: '600' }}>{lastIngested.duration.toFixed(1)} ms</span></span>
                <span style={{ color: '#242424' }}>|</span>
                <span>Status: <span style={{ padding: '2px 6px', borderRadius: '4px', background: lastIngested.status === 'ERROR' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)', color: lastIngested.status === 'ERROR' ? '#ef4444' : '#22c55e', border: `1px solid ${lastIngested.status === 'ERROR' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)'}`, fontSize: '11px', fontWeight: '700' }}>{lastIngested.status}</span></span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onSelectTrace(lastIngested.trace_id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#3b82f6', color: '#ffffff', border: 'none',
              padding: '10px 16px', borderRadius: '8px', fontSize: '14px',
              fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
          >
            <Eye size={16} />
            View Trace Details
          </button>
        </div>
      )}

      <div style={{
        background: '#121212',
        border: '1px solid #242424',
        borderRadius: '12px',
        padding: '28px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '14px', fontWeight: '600' }}>
            <Code size={16} color="#3b82f6" />
            Trace JSON Input
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: '#6b7280', fontSize: '12px', marginRight: '4px' }}>Load template:</span>
            {['banking', 'food', 'retail', 'general'].map((key) => (
              <button
                key={key}
                onClick={() => handleLoadExample(key)}
                style={{
                  background: '#0B0B0B',
                  color: '#9ca3af',
                  border: '1px solid #242424',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#f5f5f5'; e.currentTarget.style.borderColor = '#333333'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#242424'; }}
              >
                {key === 'food' ? 'Food' : key}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder={`{\n  "spans": [\n    {\n      "trace_id": "req-bank-001",\n      "span_id": "s1",\n      "service_name": "checkout-service",\n      "operation_name": "process_payment",\n      "duration_ms": 150,\n      "status": "OK"\n    }\n  ]\n}`}
          style={{
            width: '100%',
            height: '280px',
            background: '#0B0B0B',
            border: '1px solid #242424',
            borderRadius: '8px',
            padding: '16px',
            color: '#f5f5f5',
            fontFamily: '"JetBrains Mono", Consolas, monospace',
            fontSize: '13px',
            lineHeight: '1.6',
            resize: 'vertical',
            outline: 'none',
            marginBottom: '16px',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#242424'}
        />

        <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px' }}>
          💡 Paste OpenTelemetry-style trace JSON to analyze and visualize your trace.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, paddingRight: '16px' }}>
            {status && (
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px',
                color: status.type === 'error' ? '#ef4444' : '#22c55e',
                background: status.type === 'error' ? 'rgba(239, 68, 68, 0.04)' : 'rgba(34, 197, 94, 0.04)',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                border: `1px solid ${status.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)'}`
              }}>
                {status.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                <span style={{ wordBreak: 'break-all' }}>{status.message}</span>
              </div>
            )}
          </div>
          
          <button
            onClick={handleIngest}
            disabled={loading || !jsonInput.trim()}
            style={{
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: (loading || !jsonInput.trim()) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: (loading || !jsonInput.trim()) ? 0.6 : 1,
              transition: 'background 0.2s ease',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
            }}
            onMouseOver={(e) => { if (!loading && jsonInput.trim()) e.currentTarget.style.background = '#2563eb'; }}
            onMouseOut={(e) => { if (!loading && jsonInput.trim()) e.currentTarget.style.background = '#3b82f6'; }}
          >
            {loading ? (
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <UploadCloud size={16} />
            )}
            {loading ? 'Ingesting...' : 'Ingest Trace'}
          </button>
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
