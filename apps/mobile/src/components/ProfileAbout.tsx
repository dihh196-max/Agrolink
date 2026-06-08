import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, typography, borderRadius, shadows } from '../constants/theme.js'

const ROLE_LABELS: Record<string, string> = {
  producer: 'Produtor Rural',
  supplier: 'Fornecedor',
  technician: 'Técnico / Consultor',
  cooperative: 'Cooperativa',
}

type Props = {
  user: {
    role?: string
    bio?: string
    city?: string
    state?: string
    occupation?: string
    experienceYears?: string
    cultures?: string
    website?: string
    instagram?: string
    phone?: string
    birthDate?: string
    createdAt?: string
  }
  showContact?: boolean
}

function fmtMember(iso?: string): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  } catch {
    return null
  }
}

function hasAnyAbout(u: Props['user']): boolean {
  return !!(u.bio || u.occupation || u.experienceYears || u.cultures || u.city || u.birthDate)
}

function hasAnyContact(u: Props['user']): boolean {
  return !!(u.website || u.instagram || u.phone)
}

export function ProfileAbout({ user, showContact = false }: Props) {
  const member = fmtMember(user.createdAt)
  const culturesList = user.cultures?.split(',').map((c) => c.trim()).filter(Boolean) ?? []

  if (!hasAnyAbout(user) && !member && !(showContact && hasAnyContact(user))) return null

  return (
    <View style={s.wrap}>
      {hasAnyAbout(user) && (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={s.cardTitle}>Sobre</Text>
          </View>

          {!!user.bio && <Text style={s.bio}>{user.bio}</Text>}

          {!!user.occupation && (
            <Row icon="briefcase-outline" text={user.occupation} />
          )}
          {!!user.experienceYears && (
            <Row icon="trophy-outline" text={`${user.experienceYears} ano${user.experienceYears === '1' ? '' : 's'} no agro`} />
          )}
          {(user.city || user.state) && (
            <Row icon="location-outline" text={`${user.city ?? ''}${user.city && user.state ? '/' : ''}${user.state ?? ''}`} />
          )}
          {!!user.birthDate && (
            <Row icon="gift-outline" text={`Nascimento: ${user.birthDate}`} />
          )}
          {user.role && ROLE_LABELS[user.role] && (
            <Row icon="ribbon-outline" text={ROLE_LABELS[user.role]} />
          )}
          {!!member && (
            <Row icon="calendar-outline" text={`No AgroLink desde ${member}`} />
          )}

          {culturesList.length > 0 && (
            <>
              <Text style={s.subTitle}>Cultivos</Text>
              <View style={s.tagsRow}>
                {culturesList.map((c) => (
                  <View key={c} style={s.tag}>
                    <Text style={s.tagText}>{c}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {showContact && hasAnyContact(user) && (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="call-outline" size={18} color={colors.primary} />
            <Text style={s.cardTitle}>Contato</Text>
          </View>

          {!!user.phone && (
            <Linkable
              icon="logo-whatsapp"
              text={user.phone}
              onPress={() => Linking.openURL(`https://wa.me/55${user.phone!.replace(/\D/g, '')}`)}
            />
          )}
          {!!user.instagram && (
            <Linkable
              icon="logo-instagram"
              text={`@${user.instagram}`}
              onPress={() => Linking.openURL(`https://instagram.com/${user.instagram}`)}
            />
          )}
          {!!user.website && (
            <Linkable
              icon="globe-outline"
              text={user.website}
              onPress={() => {
                const url = user.website!.startsWith('http') ? user.website! : `https://${user.website}`
                Linking.openURL(url)
              }}
            />
          )}
        </View>
      )}
    </View>
  )
}

function Row({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon as any} size={16} color={colors.textSecondary} />
      <Text style={s.rowText}>{text}</Text>
    </View>
  )
}

function Linkable({ icon, text, onPress }: { icon: string; text: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon as any} size={16} color={colors.primary} />
      <Text style={[s.rowText, { color: colors.primary, fontWeight: '600' }]}>{text}</Text>
      <Ionicons name="open-outline" size={14} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  wrap: { gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
    gap: spacing.xs,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  cardTitle: { ...typography.h4, color: colors.text, fontWeight: '700' },
  bio: { ...typography.body, color: colors.text, lineHeight: 22, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  rowText: { ...typography.bodySmall, color: colors.text },
  subTitle: { ...typography.label, color: colors.textSecondary, fontWeight: '700', marginTop: spacing.sm, marginBottom: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  tagText: { ...typography.caption, color: '#166534', fontWeight: '700' },
})
