import React from 'react';

if (!document.getElementById('skeleton-shimmer-style')) {
  const style = document.createElement('style');
  style.id = 'skeleton-shimmer-style';
  style.textContent = '@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }';
  document.head.appendChild(style);
}

function Skeleton({ rows = 1, type = 'row' }) {
  const shimmerStyle = {
    background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '6px',
  };

  if (type === 'card') {
    return React.createElement('div', {
      style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }
    },
      Array.from({ length: rows }).map((_, i) =>
        React.createElement('div', {
          key: i,
          style: {
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
          }
        },
          React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '12px' } },
            React.createElement('div', { style: { ...shimmerStyle, width: '32px', height: '32px', borderRadius: '6px', flexShrink: 0 } }),
            React.createElement('div', { style: { ...shimmerStyle, flex: 1, height: '18px', marginTop: '7px' } })
          ),
          React.createElement('div', { style: { ...shimmerStyle, height: '12px', marginBottom: '8px', width: '60%' } }),
          React.createElement('div', { style: { ...shimmerStyle, height: '13px', marginBottom: '6px' } }),
          React.createElement('div', { style: { ...shimmerStyle, height: '13px', marginBottom: '12px', width: '80%' } }),
          React.createElement('div', { style: { display: 'flex', gap: '6px' } },
            React.createElement('div', { style: { ...shimmerStyle, width: '40px', height: '20px', borderRadius: '4px' } }),
            React.createElement('div', { style: { ...shimmerStyle, width: '40px', height: '20px', borderRadius: '4px' } })
          )
        )
      )
    );
  }

  return React.createElement('div', null,
    Array.from({ length: rows }).map((_, i) =>
      React.createElement('div', {
        key: i,
        style: {
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 0',
          borderBottom: '1px solid var(--border)',
        }
      },
        React.createElement('div', { style: { ...shimmerStyle, width: '24px', height: '24px', borderRadius: '4px', flexShrink: 0 } }),
        React.createElement('div', { style: { ...shimmerStyle, width: `${60 + (i % 3) * 15}%`, height: '16px' } }),
        React.createElement('div', { style: { ...shimmerStyle, width: '80px', height: '16px', marginLeft: 'auto' } })
      )
    )
  );
}

export { Skeleton };
