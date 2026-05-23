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
    } catch {
      Alert.alert('Erro', 'Email ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={[colors.primaryDark, colors.primary, colors.primaryLight]} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>🌱 AgroLink</Text>
          <Text style={styles.tagline}>A rede social do campo</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Entrar</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.link}>Não tem conta? Cadastre-se</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { fontSize: 36, fontWeight: '800', color: colors.white, marginBottom: spacing.xs },
  tagline: { ...typography.body, color: 'rgba(255,255,255,0.8)' },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { ...typography.h4, color: colors.white },
  link: { ...typography.body, color: colors.primary, textAlign: 'center', marginTop: spacing.sm },
})
