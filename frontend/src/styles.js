// Modern color system
const COLORS = {
  primary: '#0F766E',        // Teal (healthcare, calming)
  primaryLight: '#14B8A6',
  primaryDark: '#0D5F57',
  secondary: '#0284C7',      // Sky blue
  success: '#059669',        // Green
  warning: '#D97706',        // Amber
  danger: '#DC2626',         // Red
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    150: '#EFEFEF',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
}

export const RISK_COLORS = {
  CRITICAL: {
    bg: '#FEF2F2',
    border: COLORS.danger,
    text: '#7F1D1D',
    badgeBg: COLORS.danger,
    badge: 'white',
  },
  HIGH: {
    bg: '#FFFBEB',
    border: COLORS.warning,
    text: '#78350F',
    badgeBg: COLORS.warning,
    badge: 'white',
  },
  MODERATE: {
    bg: '#F5F3FF',
    border: '#A855F7',
    text: '#4C1D95',
    badgeBg: '#A855F7',
    badge: 'white',
  },
  LOW: {
    bg: '#F0F9FF',
    border: COLORS.secondary,
    text: '#082F49',
    badgeBg: COLORS.secondary,
    badge: 'white',
  },
}

export const s = {
  colors: COLORS,

  // Cards and containers
  card: {
    padding: 24,
    borderRadius: 14,
    background: 'white',
    border: `1px solid ${COLORS.gray[200]}`,
    marginBottom: 20,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Typography
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.gray[600],
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 16px',
    display: 'block',
  },

  detail: {
    fontSize: 14,
    lineHeight: 1.6,
    color: COLORS.gray[700],
    margin: 0,
  },

  // Form inputs
  textArea: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: `2px solid ${COLORS.gray[200]}`,
    fontSize: 15,
    lineHeight: 1.6,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'all 0.2s ease',
    background: 'white',
    resize: 'vertical',
  },

  // Buttons
  submitBtn: {
    width: '100%',
    padding: '12px 20px',
    borderRadius: 10,
    border: 'none',
    background: COLORS.primary,
    color: 'white',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: `0 2px 8px rgba(15, 118, 110, 0.2)`,
    fontFamily: 'inherit',
  },

  badge: {
    color: 'white',
    fontSize: 11,
    fontWeight: 700,
    padding: '6px 12px',
    borderRadius: 6,
    letterSpacing: '0.04em',
    flexShrink: 0,
    display: 'inline-block',
  },
}
