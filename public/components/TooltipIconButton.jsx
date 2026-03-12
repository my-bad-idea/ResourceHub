function TooltipIconButton({ label, children, buttonStyle, tooltipOffset = 8, placement = 'top', ...buttonProps }) {
  const [visible, setVisible] = React.useState(false);
  const tooltipPositionStyle = placement === 'left'
    ? {
        right: `calc(100% + ${tooltipOffset}px)`,
        top: '50%',
        transform: 'translateY(-50%)',
      }
    : {
        bottom: `calc(100% + ${tooltipOffset}px)`,
        left: '50%',
        transform: 'translateX(-50%)',
      };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <button
        aria-label={label}
        title={label}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        {...buttonProps}
        style={buttonStyle}
      >
        {children}
      </button>
      {visible && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            ...tooltipPositionStyle,
            padding: '6px 10px',
            borderRadius: '10px',
            background: 'color-mix(in srgb, var(--surface-elevated) 94%, var(--control-bg-muted))',
            border: '1px solid var(--control-border)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: 'var(--shadow-control-hover)',
            zIndex: 20,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

window.TooltipIconButton = TooltipIconButton;
