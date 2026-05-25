import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '../../store/auth.js'
import { colors, spacing, typography, borderRadius } from '../../constants/theme.js'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha email e senha')
      return
    }
    setLoading(true)
    try {
      await login(email.toLowerCase().trim(), password)
      router.replace('/(tabs)/feed')
    } catch (e: any) {
      const msg = e.response?.data?.error ?? 'Email ou senha incorretos'
      Alert.alert('Erro', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={[colors.primaryDark, colors.primary, colors.primaryLight]} style={s.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.container}>
        <View style={s.header}>
          <Text style={s.logo}>🌱 AgroLink</Text>
          <Text style={s.tagline}>A rede social do campo</Text>
        </View>

        <View style={s.card}>
          <Text style={s.title}>Entrar</Text>

          <View style={{ gap: 4 }}>
            <Text style={s.fieldLabel}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={{ gap: 4 }}>
            <Text style={s.fieldLabel}>Senha</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.inputFlex}
                placeholder="Sua senha"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPw((v) => !v)} style={s.eyeBtn}>
                <Text style={s.eyeIcon}>{showPw ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={() => Alert.alert('Recuperar senha', 'Entre em contato pelo email suporte@agrolink.com.br')} style={s.forgotRow}>
            <Text style={s.forgotTxt}>Esqueci minha senha</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.white} /> : <Text style={s.btnText}>Entrar</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={s.link}>Não tem conta? Cadastre-se grátis</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const s = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { fontSize: 36, fontWeight: '800', color: colors.white, marginBottom: spacing.xs },
  tagline: { ...typography.body, color: 'rgba(255,255,255,0.8)' },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.xl, gap: spacing.md },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  inputFlex: { flex: 1, padding: spacing.md, ...typography.body, color: colors.text },
  eyeBtn: { width: 48, alignItems: 'center', justifyContent: 'center' },
  eyeIcon: { fontSize: 18 },
  forgotRow: { alignSelf: 'flex-end', marginTop: -spacing.xs },
  forgotTxt: { ...typography.bodySmall, color: colors.primary },
  btn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center' },
  btnText: { ...typography.h4, color: colors.white },
  link: { ...typography.body, color: colors.primary, textAlign: 'center' },
})
