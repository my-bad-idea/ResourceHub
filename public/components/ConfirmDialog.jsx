// ConfirmDialog.jsx
function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = '确认删除', loading = false }) {
  const { AlertTriangle, Loader } = lucide;
  if (!isOpen) return null;

  return React.createElement('div', {
    style: {
      position: 'fixed', inset: 0,
      background: 'rgba(19,34,56,0.28)',
      zIndex: 1001,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }
  },
    React.createElement('div', {
      style: {
        width: '400px', maxWidth: '100%',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-modal)',
        padding: '24px',
      }
    },
      React.createElement('div', { style: { display: 'flex', gap: '12px', marginBottom: '16px' } },
        React.createElement('div', {
          style: {
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'color-mix(in srgb, var(--danger) 10%, var(--surface-elevated))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }
        }, React.createElement(AlertTriangle, { size: 20, style: { color: 'var(--danger)' } })),
        React.createElement('div', null,
          React.createElement('h3', {
            style: { fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }
          }, title),
          React.createElement('p', {
            style: { fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }
          }, message)
        )
      ),
      React.createElement('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
        React.createElement('button', {
          onClick: onClose,
          disabled: loading,
          style: {
            padding: '8px 16px', border: '1px solid var(--border)',
            background: 'var(--surface-elevated)', color: 'var(--text-primary)',
            borderRadius: '10px', cursor: 'pointer', fontSize: '14px',
            boxShadow: 'var(--shadow-control)',
          }
        }, '取消'),
        React.createElement('button', {
          onClick: onConfirm,
          disabled: loading,
          style: {
            padding: '8px 16px', border: 'none',
            background: 'var(--danger)', color: '#fff',
            borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px',
            opacity: loading ? 0.7 : 1,
            boxShadow: '0 10px 20px color-mix(in srgb, var(--danger) 16%, transparent)',
          }
        },
          loading && React.createElement(Loader, {
            size: 14,
            style: { animation: 'spin 1s linear infinite' },
          }),
          confirmText
        )
      )
    )
  );
}

window.ConfirmDialog = ConfirmDialog;
