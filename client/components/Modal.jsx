import React, { useEffect } from 'react';
import { X } from 'lucide-react';

let modalLockCount = 0;
let modalBodyLockState = null;

function Modal({
  isOpen,
  onClose,
  title,
  children,
  width = '520px',
  closeOnBackdrop = true,
  closeOnEscape = true,
  fullScreen = false,
}) {
  useEffect(() => {
    if (!isOpen) return;

    if (modalLockCount === 0) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      modalBodyLockState = {
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight,
      };
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
        // 固定定位的 header 相对视口，不受 body padding 影响；滚动条消失后视口变宽会导致个人菜单右移，需同步补偿
        const headerShell = document.querySelector('[data-rh-layout-header-shell]');
        if (headerShell) {
          modalBodyLockState.headerPaddingRight = headerShell.style.paddingRight;
          headerShell.style.paddingRight = `${scrollbarWidth}px`;
        }
      }
    }
    modalLockCount += 1;

    const handler = (e) => {
      if (e.key === 'Escape' && closeOnEscape) {
        if (document.querySelector('[role="listbox"]')) return;
        onClose();
      }
    };
    document.addEventListener('keydown', handler);

    return () => {
      document.removeEventListener('keydown', handler);

      const nextLockCount = Math.max(modalLockCount - 1, 0);
      modalLockCount = nextLockCount;
      if (nextLockCount === 0) {
        const previousState = modalBodyLockState || {};
        document.body.style.overflow = previousState.overflow || '';
        document.body.style.paddingRight = previousState.paddingRight || '';
        const headerShell = document.querySelector('[data-rh-layout-header-shell]');
        if (headerShell && previousState.headerPaddingRight !== undefined) {
          headerShell.style.paddingRight = previousState.headerPaddingRight || '';
        }
        modalBodyLockState = null;
      }
    };
  }, [closeOnEscape, isOpen, onClose]);

  if (!isOpen) return null;

  return React.createElement('div', {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(19,34,56,0.28)',
      zIndex: 1000,
      display: 'flex',
      alignItems: fullScreen ? 'stretch' : 'center',
      justifyContent: fullScreen ? 'stretch' : 'center',
      padding: fullScreen ? 0 : '16px',
    },
    onClick: (e) => {
      if (!closeOnBackdrop) return;
      if (e.target === e.currentTarget) onClose();
    }
  },
    React.createElement('div', {
      style: {
        width: fullScreen ? '100%' : width,
        maxWidth: '100%',
        maxHeight: fullScreen ? '100vh' : '90vh',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
        borderRadius: fullScreen ? 0 : '16px',
        boxShadow: 'var(--shadow-modal)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      },
    },
      // Header
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 22px 14px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }
      },
        React.createElement('h2', {
          style: { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }
        }, title),
        React.createElement('button', {
          onClick: onClose,
          style: {
            background: 'var(--surface-muted)', border: '1px solid color-mix(in srgb, var(--control-border) 72%, transparent)', cursor: 'pointer',
            color: 'var(--text-secondary)', padding: '4px',
            borderRadius: '10px', display: 'flex', alignItems: 'center',
          }
        }, React.createElement(X, { size: 18 }))
      ),
      // Content (scrollable)
      React.createElement('div', {
        style: { padding: '20px 22px 22px', overflowY: 'auto', flex: 1 }
      }, children)
    )
  );
}

export { Modal };
