import React from 'react';
import { Mail } from 'lucide-react';
import { useAppState, useAppDispatch } from '../context/AppContext';

function EmailPreviewModal() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  if (!state || !state.emailPreview) return null;
  const { emailPreview } = state;

  const close = () => dispatch({ type: 'SET_EMAIL_PREVIEW', emailPreview: null });

  return React.createElement('div', {
    style: {
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 1002,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }
  },
    React.createElement('div', {
      style: {
        width: '520px', maxWidth: '100%',
        maxHeight: '90vh',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-modal)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }
    },
      React.createElement('div', {
        style: {
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }
      },
        React.createElement('div', {
          style: {
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(47,129,247,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }
        }, React.createElement(Mail, { size: 16, style: { color: 'var(--brand)' } })),
        React.createElement('h2', {
          style: { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }
        }, '模拟邮件（开发预览）')
      ),
      React.createElement('div', { style: { padding: '20px 24px', overflowY: 'auto', flex: 1 } },
        React.createElement('div', { style: { marginBottom: '12px' } },
          React.createElement('span', { style: { fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 } }, '收件人：'),
          React.createElement('span', { style: { fontSize: '14px', color: 'var(--text-primary)' } }, emailPreview.to)
        ),
        React.createElement('div', { style: { marginBottom: '12px' } },
          React.createElement('span', { style: { fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 } }, '主题：'),
          React.createElement('span', { style: { fontSize: '14px', color: 'var(--text-primary)' } }, emailPreview.subject)
        ),
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '8px' } }, '正文：'),
          React.createElement('pre', {
            style: {
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '13px',
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              margin: 0,
            }
          }, emailPreview.body)
        )
      ),
      React.createElement('div', {
        style: { padding: '16px 24px', borderTop: '1px solid var(--border)' }
      },
        React.createElement('button', {
          onClick: close,
          style: {
            width: '100%', padding: '8px 16px',
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }
        }, '关闭')
      )
    )
  );
}

export { EmailPreviewModal };
