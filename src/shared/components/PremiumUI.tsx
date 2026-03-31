import React from 'react';

/* ═══════════════════════════════════════════════════════════════
   BUTTON COMPONENTS - ENTERPRISE DESIGN
═══════════════════════════════════════════════════════════════ */

interface PrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  icon,
  loading,
  children,
  ...props
}) => (
  <button
    {...props}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      paddingLeft: '24px',
      paddingRight: '24px',
      paddingTop: '12px',
      paddingBottom: '12px',
      background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      boxShadow: '0 8px 16px rgba(14, 165, 233, 0.3)',
      opacity: loading ? 0.7 : 1,
      pointerEvents: loading ? 'none' : 'auto',
      ...props.style,
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.transform =
        'translateY(-2px)';
      (e.currentTarget as HTMLButtonElement).style.boxShadow =
        '0 12px 24px rgba(14, 165, 233, 0.4)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.transform =
        'translateY(0)';
      (e.currentTarget as HTMLButtonElement).style.boxShadow =
        '0 8px 16px rgba(14, 165, 233, 0.3)';
    }}
  >
    {loading ? (
      <div
        style={{
          animation: 'spin 1s linear infinite',
          width: '16px',
          height: '16px',
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: 'white',
          borderRadius: '50%',
        }}
      />
    ) : (
      icon
    )}
    {children}
  </button>
);

interface SecondaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  icon,
  children,
  ...props
}) => (
  <button
    {...props}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      paddingLeft: '20px',
      paddingRight: '20px',
      paddingTop: '10px',
      paddingBottom: '10px',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(248,250,252,0.5))',
      color: '#0f172a',
      border: '1.5px solid rgba(14, 165, 233, 0.2)',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      ...props.style,
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.borderColor =
        '#0ea5e9';
      (e.currentTarget as HTMLButtonElement).style.background =
        'linear-gradient(135deg, #e0f2fe 0%, rgba(255,255,255,0.8) 100%)';
      (e.currentTarget as HTMLButtonElement).style.transform =
        'translateY(-2px)';
      (e.currentTarget as HTMLButtonElement).style.boxShadow =
        '0 8px 16px rgba(14, 165, 233, 0.15)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.borderColor =
        'rgba(14, 165, 233, 0.2)';
      (e.currentTarget as HTMLButtonElement).style.background =
        'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(248,250,252,0.5))';
      (e.currentTarget as HTMLButtonElement).style.transform =
        'translateY(0)';
      (e.currentTarget as HTMLButtonElement).style.boxShadow =
        'none';
    }}
  >
    {icon}
    {children}
  </button>
);

/* ═══════════════════════════════════════════════════════════════
   BADGE COMPONENTS
═══════════════════════════════════════════════════════════════ */

interface BadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'info' | 'accent';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant, children, icon }) => {
  const badgeStyles = {
    success: {
      bg: 'rgba(16, 185, 129, 0.1)',
      color: '#047857',
      border: '1px solid rgba(16, 185, 129, 0.3)',
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.1)',
      color: '#b45309',
      border: '1px solid rgba(245, 158, 11, 0.3)',
    },
    danger: {
      bg: 'rgba(239, 68, 68, 0.1)',
      color: '#dc2626',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    },
    info: {
      bg: 'rgba(14, 165, 233, 0.1)',
      color: '#0284c7',
      border: '1px solid rgba(14, 165, 233, 0.3)',
    },
    accent: {
      bg: 'rgba(168, 85, 247, 0.1)',
      color: '#7c3aed',
      border: '1px solid rgba(168, 85, 247, 0.3)',
    },
  };

  const style = badgeStyles[variant];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        paddingLeft: '10px',
        paddingRight: '10px',
        paddingTop: '6px',
        paddingBottom: '6px',
        background: style.bg,
        color: style.color,
        border: style.border,
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
      }}
    >
      {icon}
      {children}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════
   STAT CARD COMPONENT
═══════════════════════════════════════════════════════════════ */

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  icon,
  trend,
}) => (
  <div
    style={{
      background:
        'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(248,250,252,0.5))',
      border: '1px solid rgba(14, 165, 233, 0.15)',
      borderRadius: '16px',
      padding: '20px',
      transition: 'all 0.3s ease',
      cursor: 'default',
    }}
    onMouseEnter={(e) => {
      const el = e.currentTarget as HTMLDivElement;
      el.style.transform = 'translateY(-4px)';
      el.style.borderColor = '#0ea5e9';
      el.style.boxShadow = '0 12px 24px rgba(14, 165, 233, 0.15)';
    }}
    onMouseLeave={(e) => {
      const el = e.currentTarget as HTMLDivElement;
      el.style.transform = 'translateY(0)';
      el.style.borderColor = 'rgba(14, 165, 233, 0.15)';
      el.style.boxShadow = 'none';
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px',
      }}
    >
      {icon && (
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(168, 85, 247, 0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0ea5e9',
            fontSize: '18px',
          }}
        >
          {icon}
        </div>
      )}
      {trend && (
        <span
          style={{
            color:
              trend === 'up'
                ? '#10b981'
                : trend === 'down'
                  ? '#ef4444'
                  : '#64748b',
          }}
        >
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
        </span>
      )}
    </div>
    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
      {value}
    </div>
    <div
      style={{
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        color: '#64748b',
        letterSpacing: '0.5px',
      }}
    >
      {label}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   ALERT COMPONENT
═══════════════════════════════════════════════════════════════ */

interface AlertProps {
  variant: 'success' | 'warning' | 'danger' | 'info';
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  variant,
  title,
  children,
  icon,
}) => {
  const alertStyles = {
    success: {
      bg: 'rgba(16, 185, 129, 0.05)',
      border: '1px solid rgba(16, 185, 129, 0.2)',
      icon: '✓',
      color: '#047857',
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.05)',
      border: '1px solid rgba(245, 158, 11, 0.2)',
      icon: '⚠',
      color: '#b45309',
    },
    danger: {
      bg: 'rgba(239, 68, 68, 0.05)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      icon: '✕',
      color: '#dc2626',
    },
    info: {
      bg: 'rgba(14, 165, 233, 0.05)',
      border: '1px solid rgba(14, 165, 233, 0.2)',
      icon: 'ℹ',
      color: '#0284c7',
    },
  };

  const style = alertStyles[variant];

  return (
    <div
      style={{
        background: style.bg,
        border: style.border,
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        gap: '12px',
      }}
    >
      <div
        style={{
          color: style.color,
          fontWeight: 700,
          fontSize: '18px',
          flexShrink: 0,
        }}
      >
        {icon || style.icon}
      </div>
      <div>
        {title && (
          <div
            style={{
              color: style.color,
              fontWeight: 700,
              marginBottom: '4px',
            }}
          >
            {title}
          </div>
        )}
        <div style={{ color: '#64748b', fontSize: '14px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};
