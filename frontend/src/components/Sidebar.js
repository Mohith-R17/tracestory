import React from 'react';
import { 
  ClipboardPaste, 
  List, 
  GitCompare, 
  Activity,
  Database,
  Building,
  Utensils,
  ShoppingCart,
  Box,
  AlertTriangle
} from 'lucide-react';

const CATEGORIES = [
  { group: "INGEST", items: [
    { key: "paste", label: "Paste Trace", icon: ClipboardPaste }
  ]},
  { group: "VIEWS", items: [
    { key: "all", label: "All Traces", icon: List },
    { key: "incidents", label: "Incidents", icon: AlertTriangle },
    { key: "compare", label: "Compare", icon: GitCompare }
  ]},
  { group: "CATEGORIES", items: [
    { key: "banking", label: "Banking", icon: Building },
    { key: "food", label: "Food Delivery", icon: Utensils },
    { key: "retail", label: "Retail", icon: ShoppingCart },
    { key: "general", label: "General", icon: Box }
  ]}
];

export default function Sidebar({ currentView, setView }) {
  return (
    <div style={{
      width: '260px',
      background: '#090909',
      borderRight: '1px solid #242424',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      height: '100%',
      color: '#f5f5f5',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', padding: '0 8px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Activity size={18} color="#3b82f6" />
        </div>
        <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px', color: '#f5f5f5' }}>
          TraceStory
        </h1>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {CATEGORIES.map((group, i) => (
          <div key={i}>
            <div style={{
              fontSize: '10px',
              fontWeight: '700',
              color: '#6b7280',
              letterSpacing: '1.2px',
              marginBottom: '6px',
              paddingLeft: '12px',
              textTransform: 'uppercase'
            }}>
              {group.group}
            </div>
            {group.items.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    color: isActive ? '#3b82f6' : '#9ca3af',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: isActive ? '600' : '500',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    marginBottom: '2px',
                    borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                    boxSizing: 'border-box'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#f5f5f5';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#9ca3af';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{
        marginTop: 'auto',
        paddingTop: '20px',
        borderTop: '1px solid #242424'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', color: '#6b7280' }}>
          <Database size={14} />
          <span style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.2px' }}>Local Backend</span>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', marginLeft: 'auto' }} />
        </div>
      </div>
    </div>
  );
}
