export const colors = {
  primary: '#1a5c2a',       // Deep agro green
  primaryLight: '#2d8a42',
  primaryDark: '#0f3d1c',
  secondary: '#f5a623',     // Harvest gold
  secondaryLight: '#fbc654',
  background: '#f8f9fa',
  surface: '#ffffff',
  surfaceSecondary: '#f0f4f0',
  border: '#e0e8e0',
  text: '#1a1a1a',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  error: '#dc2626',
  success: '#16a34a',
  warning: '#d97706',
  info: '#2563eb',
  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',

  // Culture colors
  soja: '#8b9e3a',
  milho: '#e8b84b',
  algodao: '#e5e5e5',
  cafe: '#6b3a2a',
  boi_gordo: '#b45309',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
}

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  h4: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '400' as const, lineHeight: 16 },
  label: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
}

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
}
