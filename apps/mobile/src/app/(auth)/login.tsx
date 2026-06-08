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
  ImageBackground,
} from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/auth.js'
import { colors, spacing, typography, borderRadius } from '../../constants/theme.js'

const AGRO_BG = require('../../../assets/agro-bg.png')

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
    <ImageBackground source={AGRO_BG} style={s.bg} resizeMode="cover">
      {/* Dark gradient overlay — heavier at bottom so card contrasts */}
      <LinearGradient
        colors={['rgba(10,30,15,0.45)', 'rgba(10,30,15,0.55)', 'rgba(5,18,10,0.82)']}
        style={s.overlay}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.container}>
        {/* ── Branding ── */}
        <View style={s.header}>
          <View style={s.logoRow}>
            <View style={s.leafIcon}>
              <Ionicons name="leaf" size={22} color={colors.white} />
            </View>
            <Text style={s.logoText}>AgroLink</Text>
          </View>
          <Text style={s.tagline}>A rede social do campo</Text>
        </View>

        {/* ── Login card ── */}
        <View style={s.card}>
          <Text style={s.title}>Entrar</Text>
          <Text style={s.subtitle}>Bem-vindo de volta ao agronegócio</Text>

          {/* Email */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Email</Text>
            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={17} color={colors.textMuted} style={s.inputIcon} />
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
          </View>

          {/* Senha */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Senha</Text>
            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={17} color={colors.textMuted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Sua senha"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPw((v) => !v)} style={s.eyeBtn}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Esqueci senha */}
          <TouchableOpacity
            onPress={() => Alert.alert('Recuperar senha', 'Entre em contato pelo email suporte@agrolink.com.br')}
            style={s.forgotRow}>
            <Text style={s.forgotTxt}>Esqueci minha senha</Text>
          </TouchableOpacity>

          {/* Botão entrar */}
          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={[colors.primary, colors.primaryLight]} style={s.btnGradient}>
              {loading
                ? <ActivityIndicator color={colors.white} />
                : <>
                    <Ionicons name="log-in-outline" size={18} color={colors.white} />
                    <Text style={s.btnText}>Entrar</Text>
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* Cadastro */}
          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={s.registerRow}>
            <Text style={s.registerTxt}>Não tem conta?{' '}</Text>
            <Text style={s.registerLink}>Cadastre-se grátis</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  )
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  container: { flex: 1, justifyContent: 'flex-end', padding: spacing.lg, paddingBottom: spacing.xl },

  // Branding
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  leafIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
  },
  logoText: { fontSize: 34, fontWeight: '900' as const, color: colors.white, letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' as const, letterSpacing: 0.3 },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.xl,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  title: { fontSize: 22, fontWeight: '800' as const, color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs },

  // Fields
  fieldGroup: { gap: 5 },
  fieldLabel: { fontSize: 12, fontWeight: '700' as const, color: colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  inputIcon: { paddingLeft: spacing.md },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    fontSize: 15,
    color: colors.text,
  },
  eyeBtn: { width: 46, alignItems: 'center', justifyContent: 'center' },

  // Forgot
  forgotRow: { alignSelf: 'flex-end', marginTop: -spacing.xs + 2 },
  forgotTxt: { fontSize: 13, color: colors.primary, fontWeight: '600' as const },

  // Button
  btn: { borderRadius: borderRadius.md, overflow: 'hidden', marginTop: spacing.xs },
  btnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md + 2,
  },
  btnText: { fontSize: 16, fontWeight: '700' as const, color: colors.white },

  // Register
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xs },
  registerTxt: { fontSize: 14, color: colors.textSecondary },
  registerLink: { fontSize: 14, fontWeight: '700' as const, color: colors.primary },
})
