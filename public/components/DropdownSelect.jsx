function DropdownSelect({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = '请选择',
  ariaLabel = '下拉选择',
  variant = 'field',
  align = 'left',
  width = null,
  minWidth = null,
  maxWidth = null,
  triggerProps = {},
  menuProps = {},
  renderValue = null,
}) {
  const { ChevronDown, Check } = lucide;
  const [open, setOpen] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(value);
  const containerRef = React.useRef(null);
  const triggerRef = React.useRef(null);
  const optionRefs = React.useRef({});

  const normalizedOptions = Array.isArray(options) ? options : [];
  const selectedOption = normalizedOptions.find((option) => option.value === value) || null;

  React.useEffect(() => {
    setHighlighted(value);
  }, [value]);

  React.useEffect(() => {
    if (!open || disabled) return undefined;

    const currentIndex = () => {
      const index = normalizedOptions.findIndex((option) => option.value === highlighted);
      return index >= 0 ? index : Math.max(normalizedOptions.findIndex((option) => option.value === value), 0);
    };

    const moveHighlight = (direction) => {
      if (normalizedOptions.length === 0) return;
      const nextIndex = (currentIndex() + direction + normalizedOptions.length) % normalizedOptions.length;
      setHighlighted(normalizedOptions[nextIndex].value);
    };

    const handleMouseDown = (event) => {
      if (containerRef.current?.contains(event.target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveHighlight(1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveHighlight(-1);
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const nextOption = normalizedOptions.find((option) => option.value === highlighted);
        if (nextOption) {
          onChange(nextOption.value);
          setOpen(false);
          triggerRef.current?.focus();
        }
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    const frame = window.requestAnimationFrame(() => {
      const targetValue = highlighted ?? value ?? normalizedOptions[0]?.value;
      optionRefs.current[targetValue]?.focus();
    });

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.cancelAnimationFrame(frame);
    };
  }, [disabled, highlighted, normalizedOptions, onChange, open, value]);

  const triggerLabel = renderValue
    ? renderValue(selectedOption)
    : (selectedOption ? selectedOption.label : placeholder);
  const { style: triggerStyleOverride, ...triggerPropsRest } = triggerProps || {};
  const { style: menuStyleOverride, ...menuPropsRest } = menuProps || {};

  const triggerBaseStyle = variant === 'pill'
    ? {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        minHeight: '36px',
        padding: '0 14px',
        borderRadius: '999px',
        border: open
          ? '1px solid var(--brand)'
          : '1px solid var(--control-border)',
        background: open
          ? 'color-mix(in srgb, var(--brand-soft) 82%, var(--control-bg))'
          : 'color-mix(in srgb, var(--control-bg) 94%, var(--control-bg-muted))',
        color: open ? 'var(--brand-strong)' : 'var(--text-primary)',
        fontSize: '13px',
        fontWeight: open ? 700 : 600,
        boxShadow: open
          ? '0 0 0 1px color-mix(in srgb, var(--brand) 14%, transparent), var(--shadow-control-hover)'
          : 'var(--shadow-control)',
      }
    : {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        minHeight: '40px',
        width: width || '100%',
        padding: '0 12px',
        borderRadius: '12px',
        border: open
          ? '1px solid var(--brand)'
          : '1px solid var(--control-border)',
        background: 'color-mix(in srgb, var(--surface-elevated) 96%, var(--control-bg-muted))',
        color: 'var(--text-primary)',
        fontSize: '14px',
        fontWeight: 500,
        boxShadow: open
          ? '0 0 0 3px color-mix(in srgb, var(--brand) 14%, transparent), var(--shadow-control-hover)'
          : 'var(--shadow-control)',
      };

  const menuWidth = width || (variant === 'field' ? '100%' : minWidth || '168px');

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: width || variant === 'field' ? 'block' : 'inline-flex',
        width: width || null,
        minWidth,
        maxWidth,
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={!disabled && open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setHighlighted(value ?? normalizedOptions[0]?.value);
            setOpen(true);
          }
        }}
        style={{
          ...triggerBaseStyle,
          width: triggerBaseStyle.width || width || null,
          opacity: disabled ? 0.65 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 150ms, background 150ms, color 150ms, box-shadow 150ms',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          ...(triggerStyleOverride || {}),
        }}
        {...triggerPropsRest}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
          {triggerLabel}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: disabled ? 'var(--text-secondary)' : open ? 'var(--brand-strong)' : 'var(--text-secondary)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms, color 150ms',
            flexShrink: 0,
          }}
        />
      </button>

      {!disabled && open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: align === 'left' ? 0 : 'auto',
            right: align === 'right' ? 0 : 'auto',
            width: menuWidth,
            minWidth,
            maxWidth,
            padding: '6px',
            borderRadius: '16px',
            border: '1px solid var(--control-border)',
            background: 'color-mix(in srgb, var(--surface-elevated) 96%, var(--control-bg-muted))',
            boxShadow: 'var(--shadow-dropdown)',
            display: 'grid',
            gap: '4px',
            zIndex: 120,
            backdropFilter: 'blur(18px)',
            ...(menuStyleOverride || {}),
          }}
          {...menuPropsRest}
        >
          {normalizedOptions.map((option) => {
            const active = option.value === value;
            const isHighlighted = option.value === highlighted;
            return (
              <button
                key={option.value}
                ref={(node) => {
                  if (node) optionRefs.current[option.value] = node;
                  else delete optionRefs.current[option.value];
                }}
                type="button"
                role="option"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onMouseEnter={() => setHighlighted(option.value)}
                onFocus={() => setHighlighted(option.value)}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                {...(option.buttonProps || {})}
                style={{
                  minHeight: '38px',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: active
                    ? 'color-mix(in srgb, var(--brand-soft) 84%, var(--control-bg))'
                    : isHighlighted
                      ? 'color-mix(in srgb, var(--surface-tint) 68%, var(--control-bg))'
                      : 'transparent',
                  color: active ? 'var(--brand-strong)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: variant === 'pill' ? '13px' : '14px',
                  fontWeight: active ? 700 : isHighlighted ? 600 : 500,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'background 150ms, color 150ms',
                  appearance: 'none',
                  ...(option.buttonProps?.style || {}),
                }}
              >
                <span>{option.label}</span>
                {active && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.DropdownSelect = DropdownSelect;
