export const RISK_COLORS = {
  CRITICAL: { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B', badge: '#DC2626' },
  HIGH:     { bg: '#FEF3C7', border: '#D97706', text: '#92400E', badge: '#D97706' },
  MODERATE: { bg: '#DBEAFE', border: '#2563EB', text: '#1E40AF', badge: '#2563EB' },
  LOW:      { bg: '#DCFCE7', border: '#059669', text: '#065F46', badge: '#059669' },
}

export const s = {
  card: {
    background: 'white', borderRadius: 12, padding: 24, marginBottom: 16, border: '1px solid #F3F4F6',
  },
  badge: {
    color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 10px',
    borderRadius: 4, letterSpacing: '0.04em', flexShrink: 0,
  },
  label: {
    fontSize: 11, fontWeight: 600, color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
  },
  detail: {
    fontSize: 14, lineHeight: 1.6, color: '#374151', margin: 0,
  },
  textArea: {
    width: '100%', padding: 12, borderRadius: 8, border: '1px solid #E5E7EB',
    fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
  },
  submitBtn: {
    width: '100%', padding: 14, borderRadius: 8, border: 'none',
    background: '#059669', color: 'white', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', transition: 'background 0.2s',
  },
}
