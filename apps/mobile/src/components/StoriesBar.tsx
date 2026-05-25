import { useState } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useStories, useCreateStory } from '../hooks/useStories.js'
import { useAuthStore } from '../store/auth.js'
import { choosePhotoSource } from '../lib/media.js'
import { colors, spacing, typography } from '../constants/theme.js'
import type { Story } from '@agrolink/types'

export function StoriesBar() {
  const { data: stories, isLoading } = useStories()
  const create = useCreateStory()
  const user = useAuthStore((s) => s.user)
  const [viewing, setViewing] = useState<Story | null>(null)

  const handleAdd = async () => {
    const uri = await choosePhotoSource()
    if (!uri) return
    create.mutate({ mediaUrl: uri, mediaType: 'image' })
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Add your story */}
        <TouchableOpacity style={styles.item} onPress={handleAdd} disabled={create.isPending}>
          <View style={[styles.ring, styles.addRing]}>
            {create.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
            <View style={styles.addBadge}>
              <Ionicons name="add" size={14} color={colors.white} />
            </View>
          </View>
          <Text style={styles.label} numberOfLines={1}>Seu story</Text>
        </TouchableOpacity>

        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginLeft: spacing.md }} />}

        {stories?.map((story) => (
          <TouchableOpacity key={story.id} style={styles.item} onPress={() => setViewing(story)}>
            <View style={styles.ring}>
              {story.author?.avatarUrl ? (
                <Image source={{ uri: story.author.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>
                    {story.author?.name?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {story.author?.username ?? 'story'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Story viewer */}
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={styles.viewer}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewing(null)}>
            <Ionicons name="close" size={32} color={colors.white} />
          </TouchableOpacity>
          {viewing && (
            <>
              <View style={styles.viewerHeader}>
                <Text style={styles.viewerName}>{viewing.author?.name}</Text>
                <Text style={styles.viewerUser}>@{viewing.author?.username}</Text>
              </View>
              <Image source={{ uri: viewing.mediaUrl }} style={styles.viewerImage} resizeMode="contain" />
            </>
          )}
          <TouchableOpacity style={styles.viewerTapArea} activeOpacity={1} onPress={() => setViewing(null)} />
        </View>
      </Modal>
    </View>
  )
}

const RING = 68
const AV = 60

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  scroll: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.md },
  item: { alignItems: 'center', width: 72 },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addRing: { borderColor: colors.border, borderStyle: 'dashed' },
  avatar: { width: AV, height: AV, borderRadius: AV / 2 },
  avatarFallback: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { ...typography.h4, color: colors.white },
  addBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 11,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  label: { ...typography.caption, color: colors.textSecondary, marginTop: 4, maxWidth: 72 },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  viewerClose: { position: 'absolute', top: 48, right: spacing.md, zIndex: 2 },
  viewerHeader: { position: 'absolute', top: 52, left: spacing.md, zIndex: 2 },
  viewerName: { ...typography.label, color: colors.white },
  viewerUser: { ...typography.caption, color: 'rgba(255,255,255,0.7)' },
  viewerImage: { width: '100%', height: '80%' },
  viewerTapArea: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
})
