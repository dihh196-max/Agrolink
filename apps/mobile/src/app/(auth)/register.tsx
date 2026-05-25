import { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '../../store/auth.js'
import { api } from '../../lib/api.js'
import { colors, spacing, typography, borderRadius } from '../../constants/theme.js'

const ROLE_OPTIONS = [
  { value: 'producer', label: 'Produtor Rural', icon: '🌾' },
  { value: 'supplier', label: 'Fornecedor', icon: '🏪' },
  { value: 'technician', label: 'Técnico / Consultor', icon: '🔬' },
  { value: 'cooperative', label: 'Cooperativa', icon: '🤝' },
] as const
type Role = (typeof ROLE_OPTIONS)[number]['value']

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`
}

function passStrength(pw: string): { score: number; label: string; color: string } {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const lvl = [
    { label: '', color: colors.border },
    { label: 'Fraca', color: colors.error },
    { label: 'Média', color: colors.warning },
    { label: 'Boa', color: colors.secondary },
    { label: 'Forte', color: colors.success },
  ]
  return { score: s, ...lvl[s] }
}

type FormData = {
  name: string
  email: string
  password: string
  confirmPassword: string
  username: string
  phone: string
  role: Role
  acceptedTerms: boolean
}
type FieldErrors = Partial<Record<keyof FormData, string>>

export default function RegisterScreen() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    phone: '',
    role: 'producer',
    acceptedTerms: false,
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const usernameTimer = useRef<ReturnType<typeof setTimeout>>()

  const register = useAuthStore((s) => s.register)

  const set = (field: keyof FormData) => (value: string | boolean) => {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: undefined }))
  }

  const checkUsername = (value: string) => {
    set('username')(value)
    clearTimeout(usernameTimer.current)
    if (!value || value.length < 3) { setUsernameStatus('idle'); return }
    if (!/^[a-z0-9_]+$/.test(value)) {
      setUsernameStatus('idle')
      setErrors((p) => ({ ...p, username: 'Apenas letras minúsculas, números e _' }))
      return
    }
    setUsernameStatus('checking')
    usernameTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/auth/check?username=${value}`)
        setUsernameStatus(data.available ? 'available' : 'taken')
        setErrors((p) => ({
          ...p,
          username: data.available ? undefined : 'Nome de usuário já está em uso',
        }))
      } catch {
        setUsernameStatus('idle')
      }
    }, 600)
  }

  const validateStep1 = (): boolean => {
    const e: FieldErrors = {}
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Nome deve ter pelo menos 2 caracteres'
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
    if (!form.password || form.password.length < 8) e.password = 'Senha deve ter pelo menos 8 caracteres'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'As senhas não coincidem'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep2 = (): boolean => {
    const e: FieldErrors = {}
    if (!form.username || form.username.length < 3) e.username = 'Mínimo 3 caracteres'
    if (usernameStatus === 'taken') e.username = 'Nome de usuário já está em uso'
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) e.phone = 'Telefone inválido'
    if (!form.acceptedTerms) e.acceptedTerms = 'Você deve aceitar os termos para continuar'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return
    setLoading(true)
    try {
      await register({
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        password: form.password,
        username: form.username.toLowerCase().trim(),
        phone: form.phone,
        role: form.role,
        acceptedTerms: true,
      })
      setStep(3)
    } catch (e: any) {
      const msg = e.response?.data?.error ?? 'Erro ao criar conta'
      if (msg.includes('email')) setErrors({ email: msg })
      else if (msg.includes('usuário')) setErrors({ username: msg })
      else setErrors({ name: msg })
      setStep(msg.includes('usuário') ? 2 : 1)
    } finally {
      setLoading(false)
    }
  }

  const strength = passStrength(form.password)

  if (step === 3) {
    return (
      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={{ flex: 1 }}>
        <View style={s.successWrap}>
          <Text style={{ fontSize: 72 }}>🌱</Text>
          <Text style={s.successTitle}>Bem-vindo ao AgroLink!</Text>
          <Text style={s.successSub}>
            Olá, {form.name.split(' ')[0]}! Sua conta está pronta.
          </Text>
          <TouchableOpacity style={s.successBtn} onPress={() => router.replace('/(tabs)/feed')}>
            <Text style={s.successBtnText}>Explorar o AgroLink →</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient colors={[colors.primaryDark, colors.primary]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>🌱 AgroLink</Text>
        <Text style={s.tagline}>Crie sua conta gratuitamente</Text>

        {/* Progress dots */}
        <View style={s.progressRow}>
          {[1, 2].map((n) => (
            <View key={n} style={[s.dot, step >= n && s.dotActive]} />
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.stepLabel}>
            {step === 1 ? 'Passo 1 / 2 — Dados pessoais' : 'Passo 2 / 2 — Perfil'}
          </Text>

          {step === 1 && (
            <>
              <Field label="Nome completo" error={errors.name}>
                <TextInput
                  style={[s.input, errors.name && s.inputErr]}
                  placeholder="Seu nome completo"
                  placeholderTextColor={colors.textMuted}
                  value={form.name}
                  onChangeText={set('name')}
                  autoCapitalize="words"
                />
              </Field>

              <Field label="Email" error={errors.email}>
                <TextInput
                  style={[s.input, errors.email && s.inputErr]}
                  placeholder="seu@email.com"
                  placeholderTextColor={colors.textMuted}
                  value={form.email}
                  onChangeText={set('email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </Field>

              <Field label="Senha" error={errors.password}>
                <View style={[s.inputRow, errors.password && s.inputRowErr]}>
                  <TextInput
                    style={s.inputFlex}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor={colors.textMuted}
                    value={form.password}
                    onChangeText={set('password')}
                    secureTextEntry={!showPw}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPw((v) => !v)} style={s.eyeBtn}>
                    <Text style={s.eyeIcon}>{showPw ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
                {form.password.length > 0 && (
                  <View style={s.strengthRow}>
                    {[1, 2, 3, 4].map((i) => (
                      <View
                        key={i}
                        style={[s.strengthBar, { backgroundColor: i <= strength.score ? strength.color : colors.border }]}
                      />
                    ))}
                    {!!strength.label && (
                      <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                    )}
                  </View>
                )}
              </Field>

              <Field label="Confirmar senha" error={errors.confirmPassword}>
                <View style={[s.inputRow, errors.confirmPassword && s.inputRowErr]}>
                  <TextInput
                    style={s.inputFlex}
                    placeholder="Repita sua senha"
                    placeholderTextColor={colors.textMuted}
                    value={form.confirmPassword}
                    onChangeText={set('confirmPassword')}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} style={s.eyeBtn}>
                    <Text style={s.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </Field>

              <TouchableOpacity style={s.btn} onPress={() => validateStep1() && setStep(2)}>
                <Text style={s.btnText}>Próximo →</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Nome de usuário" error={errors.username}>
                <View style={[s.inputRow, errors.username && s.inputRowErr]}>
                  <TextInput
                    style={s.inputFlex}
                    placeholder="letras minúsculas, números e _"
                    placeholderTextColor={colors.textMuted}
                    value={form.username}
                    onChangeText={checkUsername}
                    autoCapitalize="none"
                  />
                  <View style={s.eyeBtn}>
                    {usernameStatus === 'checking' && <ActivityIndicator size="small" color={colors.primary} />}
                    {usernameStatus === 'available' && <Text>✅</Text>}
                    {usernameStatus === 'taken' && <Text>❌</Text>}
                  </View>
                </View>
              </Field>

              <Field label="Telefone (WhatsApp)" error={errors.phone}>
                <TextInput
                  style={[s.input, errors.phone && s.inputErr]}
                  placeholder="(XX) X XXXX-XXXX"
                  placeholderTextColor={colors.textMuted}
                  value={form.phone}
                  onChangeText={(v) => set('phone')(formatPhone(v))}
                  keyboardType="phone-pad"
                />
              </Field>

              <Text style={s.fieldLabel}>Tipo de conta</Text>
              <View style={s.roleGrid}>
                {ROLE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.roleBtn, form.role === opt.value && s.roleBtnActive]}
                    onPress={() => setForm((p) => ({ ...p, role: opt.value }))}
                  >
                    <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
                    <Text style={[s.roleTxt, form.role === opt.value && s.roleTxtActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={s.termsRow}
                onPress={() => set('acceptedTerms')(!form.acceptedTerms)}
              >
                <View style={[s.checkbox, form.acceptedTerms && s.checkboxOn]}>
                  {form.acceptedTerms && <Text style={s.checkmark}>✓</Text>}
                </View>
                <Text style={s.termsTxt}>
                  Li e aceito os{' '}
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>Termos de Uso</Text>
                  {' '}e a{' '}
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>Política de Privacidade</Text>
                </Text>
              </TouchableOpacity>
              {errors.acceptedTerms && <Text style={s.errTxt}>{errors.acceptedTerms}</Text>}

              <View style={s.rowBtns}>
                <TouchableOpacity style={s.backBtn} onPress={() => setStep(1)}>
                  <Text style={s.backTxt}>← Voltar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btn, { flex: 1 }]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color={colors.white} />
                    : <Text style={s.btnText}>Criar conta</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.sm }}>
            <Text style={s.link}>Já tenho conta? Entrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
      {error && <Text style={s.errTxt}>{error}</Text>}
    </View>
  )
}

const s = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  logo: { fontSize: 32, fontWeight: '800', color: colors.white, textAlign: 'center' },
  tagline: { ...typography.body, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: spacing.md },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  dot: { width: 40, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: colors.secondary },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.xl, gap: spacing.md },
  stepLabel: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldLabel: { ...typography.label, color: colors.textSecondary },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
  },
  inputErr: { borderColor: colors.error },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  inputRowErr: { borderColor: colors.error },
  inputFlex: { flex: 1, padding: spacing.md, ...typography.body, color: colors.text },
  eyeBtn: { width: 48, alignItems: 'center', justifyContent: 'center' },
  eyeIcon: { fontSize: 18 },
  strengthRow: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 4 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { ...typography.caption, marginLeft: 4, minWidth: 36 },
  errTxt: { ...typography.caption, color: colors.error },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  roleBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    width: '47%',
    gap: 4,
  },
  roleBtnActive: { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary },
  roleTxt: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' },
  roleTxtActive: { color: colors.primary, fontWeight: '600' },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  checkbox: {
    width: 22, height: 22, borderWidth: 2, borderColor: colors.border,
    borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: '700' },
  termsTxt: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  rowBtns: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  backBtn: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.md,
    padding: spacing.md, alignItems: 'center',
  },
  backTxt: { ...typography.body, color: colors.textSecondary },
  btn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center' },
  btnText: { ...typography.h4, color: colors.white },
  link: { ...typography.body, color: colors.primary, textAlign: 'center' },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  successTitle: { ...typography.h1, color: colors.white, textAlign: 'center' },
  successSub: { ...typography.body, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  successBtn: {
    backgroundColor: colors.secondary, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
  },
  successBtnText: { ...typography.h4, color: colors.primaryDark },
})
