import React from 'react';

export default function MetricCard({ title, value, unit, icon: Icon, color = "#3b82f6" }) {
  return (
    <div style={{
      background: '#121212',
      border: '1px solid #242424',
      borderRadius: '8px',
      padding: '20px',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
    }}>
      <div>
        <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ color: '#f5f5f5', fontSize: '28px', fontWeight: 'bold' }}>
            {value}
          </span>
          {unit && <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>{unit}</span>}
        </div>
      </div>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        borderRadius: '8px', 
        background: `${color}15`, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Icon size={20} color={color} />
      </div>
    </div>
  );
}

