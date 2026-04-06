// Design tokens — aligned with AnkaBanka web frontend
// Primary: violet-600 (#7c3aed), palette: slate

export const colors = {
  primary:       '#7c3aed', // violet-600
  primaryLight:  '#8b5cf6', // violet-500
  primaryTint:   '#f5f3ff', // violet-50
  primaryDark:   '#6d28d9', // violet-700

  bgPage:        '#f8fafc', // slate-50
  bgSurface:     '#ffffff',
  border:        '#e2e8f0', // slate-200
  borderFocus:   '#8b5cf6', // violet-500

  textPrimary:   '#0f172a', // slate-900
  textSecondary: '#475569', // slate-600
  textMuted:     '#94a3b8', // slate-400

  error:         '#dc2626',
  success:       '#16a34a',
  warning:       '#d97706',
  expired:       '#6b7280',
};

export const status = {
  PENDING:  colors.warning,
  APPROVED: colors.success,
  REJECTED: colors.error,
  EXPIRED:  colors.expired,
};

export const card = {
  backgroundColor: colors.bgSurface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  // minimal shadow
  shadowColor: '#0f172a',
  shadowOpacity: 0.06,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
};
