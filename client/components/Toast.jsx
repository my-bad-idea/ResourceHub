import React, { useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useAppState, useAppDispatch } from '../context/AppContext';

// Single toast item
function ToastItem({ toast, onRemove }) {
  const timerRef = useRef(null);
  const [visible, setVisible] = React.useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3000);
    return () => clearTimeout(timerRef.current);
  }, []);

  const iconMap = {
    success: React.createElement(CheckCircle, { size: 16, style: { color: 'var(--success)', flexShrink: 0 } }),
    error: React.createElement(AlertCircle, { size: 16, style: { color: 'var(--danger)', flexShrink: 0 } }),
    info: React.createElement(Info, { size: 16, style: { color: 'var(--brand)', flexShrink: 0 } }),
  };

  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      width: '320px',
      padding: '12px 16px',
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      boxShadow: 'var(--shadow-dropdown)',
      marginTop: '8px',
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0,
      transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1), opacity 300ms cubic-bezier(0.4,0,0.2,1)',
    }
  },
    iconMap[toast.type] || iconMap.info,
    React.createElement('span', {
      style: { flex: 1, fontSize: '14px', color: 'var(--text-primary)' }
    }, toast.message),
    React.createElement('button', {
      onClick: () => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); },
      style: { background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-secondary)' }
    }, React.createElement(X, { size: 14 }))
  );
}

// Container - reads from AppContext
function ToastContainer() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  if (!state) return null;

  const removeToast = (id) => dispatch({ type: 'REMOVE_TOAST', id });

  return React.createElement('div', {
    style: {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
    }
  },
    state.toasts.map(toast =>
      React.createElement(ToastItem, { key: toast.id, toast, onRemove: removeToast })
    )
  );
}

export { ToastContainer, ToastItem };
