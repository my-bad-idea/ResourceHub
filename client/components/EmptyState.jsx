import React from 'react';
import * as LucideIcons from 'lucide-react';

function EmptyState({ icon, title, description, action }) {
  const IconComponent = typeof icon === 'string' ? LucideIcons[icon] : null;

  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 24px',
      textAlign: 'center',
    }
  },
    React.createElement('div', {
      style: {
        width: '64px', height: '64px',
        borderRadius: '16px',
        background: 'var(--bg-tertiary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '16px',
      }
    },
      typeof icon === 'string' && IconComponent
        ? React.createElement(IconComponent, { size: 28, style: { color: 'var(--text-secondary)' } })
        : icon
    ),
    React.createElement('h3', {
      style: { fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }
    }, title),
    description && React.createElement('p', {
      style: { fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 16px', maxWidth: '280px', lineHeight: '1.5' }
    }, description),
    action && React.createElement('button', {
      onClick: action.onClick,
      style: {
        padding: '8px 20px',
        background: 'var(--brand)',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 500,
      }
    }, action.label)
  );
}

export { EmptyState };
