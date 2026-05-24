import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuthStore } from '../store/auth.js'
import { colors, spacing, typography, borderRadius, shadows } from '../constants/theme.js'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

interface SettingRowProps {
  icon: IoniconName
  label: string
  value?: string
  toggle?: { value: boolean; onChange: (v: boolean) => void }
  onPress?: () => void
  danger?: boolean
}

function SettingRow({ icon, label, value, toggle, onPress, danger }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!!toggle || !onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon} size={20} color={danger ? colors.error : colors.primary} />
      </View>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {toggle && (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      )}
      {!toggle && onPress && (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  )
}

export default function SettingsScreen() {
  const { user, logout } = useAuthStore()

  const [pushEnabled, setPushEnabled] = useState(true)
  const [priceAlerts, setPriceAlerts] = useState(true)
  const [weatherAlerts, setWeatherAlerts] = useState(true)
  const [socialNotifs, setSocialNotifs] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(false)

  const handleLogout = () => {
    Alert.alert('Sair da conta', 'Deseja encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ])
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir conta',
      'Esta ação é irreversível. Todos os seus dados serão removidos permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir conta',
          style: 'destructive',
          onPress: () => Alert.alert('Em breve', 'Entre em contato com suporte@agrolink.com.br'),
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Conta */}
        <Section title="Conta">
          <SettingRow
            icon="person-outline"
            label="Editar Perfil"
            onPress={() => router.push('/edit-profile')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="mail-outline"
            label="E-mail"
            value={user?.email}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="lock-closed-outline"
            label="Alterar senha"
            onPress={() =>
              Alert.alert('Alterar senha', 'Um e-mail com instruções será enviado para ' + user?.email + '.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Enviar e-mail', onPress: () => {} },
              ])
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="shield-checkmark-outline"
            label="Plano"
            value={user?.premiumUntil ? '⭐ Premium' : 'Gratuito'}
            onPress={() => Alert.alert('Premium', 'Funcionalidade em breve!')}
          />
        </Section>

        {/* Notificações */}
        <Section title="Notificações">
          <SettingRow
            icon="notifications-outline"
            label="Notificações push"
            toggle={{ value: pushEnabled, onChange: setPushEnabled }}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="trending-up-outline"
            label="Alertas de preço"
            toggle={{ value: priceAlerts, onChange: setPriceAlerts }}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="partly-sunny-outline"
            label="Alertas de clima"
            toggle={{ value: weatherAlerts, onChange: setWeatherAlerts }}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="people-outline"
            label="Atividade social (curtidas, seguidores)"
            toggle={{ value: socialNotifs, onChange: setSocialNotifs }}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="mail-outline"
            label="E-mails de marketing"
            toggle={{ value: marketingEmails, onChange: setMarketingEmails }}
          />
        </Section>

        {/* Privacidade */}
        <Section title="Privacidade">
          <SettingRow
            icon="eye-outline"
            label="Quem pode ver meu perfil"
            value="Todos"
            onPress={() => Alert.alert('Em breve', 'Configuração de privacidade chegará em breve.')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="chatbubble-outline"
            label="Quem pode me enviar mensagens"
            value="Todos"
            onPress={() => Alert.alert('Em breve', 'Configuração de privacidade chegará em breve.')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="document-text-outline"
            label="Política de privacidade"
            onPress={() => Linking.openURL('https://agrolink.com.br/privacidade')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="shield-outline"
            label="Termos de uso"
            onPress={() => Linking.openURL('https://agrolink.com.br/termos')}
          />
        </Section>

        {/* Suporte */}
        <Section title="Suporte">
          <SettingRow
            icon="help-circle-outline"
            label="Central de ajuda"
            onPress={() => Linking.openURL('https://agrolink.com.br/ajuda')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="chatbox-outline"
            label="Falar com suporte"
            onPress={() => Linking.openURL('mailto:suporte@agrolink.com.br')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="star-outline"
            label="Avaliar o app"
            onPress={() => Alert.alert('Obrigado!', 'Sua avaliação nos ajuda muito. 🌱')}
          />
        </Section>

        {/* Sessão */}
        <Section title="Sessão">
          <SettingRow
            icon="log-out-outline"
            label="Sair da conta"
            onPress={handleLogout}
            danger
          />
          <View style={styles.divider} />
          <SettingRow
            icon="trash-outline"
            label="Excluir conta"
            onPress={handleDeleteAccount}
            danger
          />
        </Section>

        <Text style={styles.version}>AgroLink v1.0.0 · Made for the campo 🌾</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: { ...typography.h4, color: colors.white },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  section: { gap: spacing.xs },
  sectionTitle: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: spacing.xs },
  sectionCard: { backgroundColor: colors.white, borderRadius: borderRadius.lg, ...shadows.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
  },
  rowIconDanger: { backgroundColor: '#fee2e2' },
  rowLabel: { ...typography.body, color: colors.text, flex: 1 },
  rowLabelDanger: { color: colors.error },
  rowValue: { ...typography.bodySmall, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.md + 34 + spacing.sm },
  version: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
})
