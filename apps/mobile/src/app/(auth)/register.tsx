import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '../../store/auth.js'
import { colors, spacing, typography, borderRadius } from '../../constants/theme.js'

const ROLE_OPTIONS = [
  { value: 'producer', label: 'Produtor Rural' },
  { value: 'supplier', label: 'Fornecedor' },
  { value: 'technician', label: 'Técnico / Consultor' },
  { value: 'cooperative', label: 'Cooperativa / Trading' },
] as const

export default function RegisterScreen() {
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'producer' as const,
  })
  const [loading, setLoading] = useState(false)
  const register = useAuthStore((s) => s.register)

  const update = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.username || !form.phone) {
      Alert.alert('Atenção', 'Preencha todos os campos')
      return
    }
    setLoading(true)
    try {
      await register(form)
      router.replace('/(tabs)/feed')
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error ?? 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={[colors.primaryDark, colors.primary]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>🌱 AgroLink</Text>
        <Text style={styles.subtitle}>Crie sua conta</Text>

        <View style={styles.card}>
          {([
            ['name', 'Nome completo', false],
            ['username', 'Nome de usuário', false],
            ['email', 'Email', false],
            ['phone', 'Telefone (WhatsApp)', false],
            ['password', 'Senha', true],
          ] as [keyof typeof form, string, boolean][]).map(([field, placeholder, secure]) => (
            <TextInput
              key={field}
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
              value={form[field]}
              onChangeText={update(field)}
              secureTextEntry={secure}
              autoCapitalize={field === 'email' || field === 'username' ? 'none' : 'words'}
              keyboardType={field === 'email' ? 'email-address' : field === 'phone' ? 'phone-pad' : 'default'}
            />
          ))}

          <Text style={styles.label}>Tipo de conta</Text>
          <View style={styles.roleGrid}>
            {ROLE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.roleBtn, form.role === opt.value && styles.roleBtnActive]}
                onPress={() => setForm((p) => ({ ...p, role: opt.value }))}
              >
                <Text
                  style={[styles.roleBtnText, form.role === opt.value && styles.roleBtnTextActive]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Criar conta</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Já tenho conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl },
  logo: { fontSize: 32, fontWeight: '800', color: colors.white, textAlign: 'center' },
  subtitle: { ...typography.body, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
  },
  label: { ...typography.label, color: colors.textSecondary },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  roleBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  roleBtnActive: { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary },
  roleBtnText: { ...typography.bodySmall, color: colors.textSecondary },
  roleBtnTextActive: { color: colors.primary, fontWeight: '600' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { ...typography.h4, color: colors.white },
  link: { ...typography.body, color: colors.primary, textAlign: 'center' },
})
