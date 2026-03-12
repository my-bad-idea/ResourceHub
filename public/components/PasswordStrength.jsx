// PasswordStrength.jsx
function PasswordStrength({ password }) {
  if (!password) return null;

  let strength = 0;
  let label = '';
  let color = '';

  const hasLetters = /[a-zA-Z]/.test(password);
  const hasDigits = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isLongEnough = password.length >= 8;

  if (hasLetters && hasDigits && hasSpecial && isLongEnough) {
    strength = 3; label = '强'; color = 'var(--success)';
  } else if (hasLetters && hasDigits) {
    strength = 2; label = '中'; color = '#FF9500';
  } else {
    strength = 1; label = '弱'; color = 'var(--danger)';
  }

  return React.createElement('div', {
    style: { marginTop: '6px' }
  },
    React.createElement('div', {
      style: { display: 'flex', gap: '4px', marginBottom: '4px' }
    },
      [1, 2, 3].map(i =>
        React.createElement('div', {
          key: i,
          style: {
            flex: 1, height: '3px', borderRadius: '2px',
            background: i <= strength ? color : 'var(--bg-tertiary)',
            transition: 'background 200ms',
          }
        })
      )
    ),
    React.createElement('span', {
      style: { fontSize: '12px', color }
    }, `密码强度：${label}`)
  );
}

window.PasswordStrength = PasswordStrength;
