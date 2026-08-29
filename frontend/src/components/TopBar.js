import React from 'react';
import { Search, User } from 'lucide-react';

export default function TopBar({ searchQuery, setSearchQuery }) {
  return (
    <div style={{
      height: '64px',
      background: '#080808',
      borderBottom: '1px solid #242424',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      color: '#f5f5f5',
      boxSizing: 'border-box'
    }}>
      <div style={{ position: 'relative', width: '340px' }}>
        <Search size={14} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Search traces or service names..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            background: '#0B0B0B',
            border: '1px solid #242424',
            borderRadius: '6px',
            padding: '8px 12px 8px 34px',
            color: '#f5f5f5',
            fontSize: '13px',
            outline: 'none',
            transition: 'all 0.15s ease',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
          onBlur={(e) => { e.target.style.borderColor = '#242424'; }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px'
        }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#121212', border: '1px solid #242424', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={14} color="#3b82f6" />
          </div>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af' }}>Admin</span>
        </div>
      </div>
    </div>
  );
}

