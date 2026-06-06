import { useState, useEffect, useMemo, useRef } from 'react'
import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet,
  Modal, ActivityIndicator, Animated, Pressable, Alert, TextInput,
  Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useStories, useCreateStory } from '../hooks/useStories.js'
import { useAuthStore } from '../store/auth.js'
import { api } from '../lib/api.js'
import { choosePhotoSource } from '../lib/media.js'
import { colors, spacing, typography, borderRadius } from '../constants/theme.js'
import type { Story } from '@agrolink/types'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const STORY_DURATION = 6000 // 6 seconds per story

function useDeleteStory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/stories/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stories'] }),
  })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  return `há ${h}h`
}

// ─── Story Composer (new story screen as modal) ───────────────────────────────

function StoryComposer({
  visible, photoUri, onClose,
}: { visible: boolean; photoUri: string | null; onClose: () => void }) {
  const create = useCreateStory()
  const [caption, setCaption] = useState('')

  useEffect(() => {
    if (!visible) setCaption('')
  }, [visible])

  if (!photoUri) return null

  const handlePublish = () => {
    create.mutate(
      { mediaUrl: photoUri, mediaType: 'image' as any, ...(caption.trim() && { weatherDescription: caption.trim() }) } as any,
      {
        onSuccess: onClose,
        onError: () => Alert.alert('Erro', 'Não foi possível publicar o story.'),
      }
    )
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={comp.container}>
        <Image source={{ uri: photoUri }} style={comp.bg} resizeMode="contain" />
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.6)']}
          locations={[0, 0.3, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={comp.topBar}>
          <TouchableOpacity onPress={onClose} style={comp.iconBtn}>
            <Ionicons name="close" size={26} color={colors.white} />
          </TouchableOpacity>
          <Text style={comp.topTitle}>Novo story</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={comp.bottom}
        >
          <View style={comp.captionWrap}>
            <TextInput
              style={comp.captionInput}
              placeholder="Escreva uma legenda (opcional)..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={caption}
              onChangeText={setCaption}
              maxLength={100}
              multiline
            />
            {!!caption && (
              <Text style={comp.captionCount}>{caption.length}/100</Text>
            )}
          </View>

          <TouchableOpacity
            style={comp.publishBtn}
            onPress={handlePublish}
            disabled={create.isPending}
          >
            {create.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="send" size={18} color={colors.white} />
                <Text style={comp.publishText}>Publicar story · 24h</Text>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const comp = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bg: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: 'absolute', top: 48, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  topTitle: { ...typography.h4, color: colors.white, fontWeight: '700' },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  bottom: {
    position: 'absolute', bottom: 32, left: 0, right: 0,
    paddingHorizontal: spacing.md, gap: spacing.md,
  },
  captionWrap: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  captionInput: {
    ...typography.body, color: colors.white,
    minHeight: 40, maxHeight: 100,
  },
  captionCount: { ...typography.caption, color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
  },
  publishText: { ...typography.h4, color: colors.white, fontWeight: '700' },
})

// ─── Story Viewer ─────────────────────────────────────────────────────────────

type Group = { authorId: string; author: Story['author']; items: Story[] }

function StoryViewer({
  groups, startGroupIdx, onClose,
}: {
  groups: Group[]
  startGroupIdx: number
  onClose: () => void
}) {
  const me = useAuthStore((s) => s.user)
  const deleteStory = useDeleteStory()

  const [groupIdx, setGroupIdx] = useState(startGroupIdx)
  const [itemIdx, setItemIdx] = useState(0)
  const [paused, setPaused] = useState(false)

  const progress = useRef(new Animated.Value(0)).current
  const currentGroup = groups[groupIdx]
  const currentStory = currentGroup?.items[itemIdx]

  // Run animation
  useEffect(() => {
    if (!currentStory) return
    progress.setValue(0)
    if (paused) return
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    })
    anim.start(({ finished }) => {
      if (finished) advance()
    })
    return () => anim.stop()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, itemIdx, paused])

  const advance = () => {
    if (itemIdx + 1 < currentGroup.items.length) {
      setItemIdx(itemIdx + 1)
    } else if (groupIdx + 1 < groups.length) {
      setGroupIdx(groupIdx + 1)
      setItemIdx(0)
    } else {
      onClose()
    }
  }
  const back = () => {
    if (itemIdx > 0) {
      setItemIdx(itemIdx - 1)
    } else if (groupIdx > 0) {
      const prev = groups[groupIdx - 1]
      setGroupIdx(groupIdx - 1)
      setItemIdx(prev.items.length - 1)
    }
  }

  if (!currentStory) {
    onClose()
    return null
  }

  const isMine = me?.id === currentGroup.author.id
  const caption = (currentStory as any).weatherDescription as string | undefined

  const handleDelete = () => {
    Alert.alert('Excluir story', 'Deseja remover este story?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: () => {
          deleteStory.mutate(currentStory.id, { onSuccess: onClose })
        },
      },
    ])
  }

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={vw.container}>
        {/* Image */}
        <Image source={{ uri: currentStory.mediaUrl }} style={vw.image} resizeMode="cover" />

        {/* Dark overlays */}
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          locations={[0, 0.3]}
          style={vw.topGradient}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          locations={[0.5, 1]}
          style={vw.bottomGradient}
          pointerEvents="none"
        />

        {/* Progress bars */}
        <View style={vw.progressBars}>
          {currentGroup.items.map((_, i) => {
            const isPast = i < itemIdx
            const isCurrent = i === itemIdx
            return (
              <View key={i} style={vw.progressTrack}>
                <Animated.View
                  style={[
                    vw.progressFill,
                    isPast && { width: '100%' },
                    isCurrent && {
                      width: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            )
          })}
        </View>

        {/* Author bar */}
        <View style={vw.authorRow}>
          <TouchableOpacity
            style={vw.authorLeft}
            onPress={() => {
              onClose()
              setTimeout(() => router.push(`/profile/${currentGroup.author.username}` as any), 100)
            }}
          >
            {currentGroup.author.avatarUrl ? (
              <Image source={{ uri: currentGroup.author.avatarUrl }} style={vw.authorAvatar} />
            ) : (
              <View style={[vw.authorAvatar, { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={vw.avatarInitial}>
                  {currentGroup.author.name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <View>
              <Text style={vw.authorName}>{currentGroup.author.name}</Text>
              <Text style={vw.authorSub}>
                @{currentGroup.author.username} · {timeAgo((currentStory as any).createdAt ?? new Date().toISOString())}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={vw.authorActions}>
            {isMine && (
              <TouchableOpacity style={vw.iconBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color={colors.white} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={vw.iconBtn} onPress={onClose}>
              <Ionicons name="close" size={26} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tap zones */}
        <Pressable
          style={vw.tapLeft}
          onPress={back}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
        />
        <Pressable
          style={vw.tapRight}
          onPress={advance}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
        />

        {/* Caption */}
        {!!caption && (
          <View style={vw.captionWrap} pointerEvents="none">
            <Text style={vw.caption}>{caption}</Text>
          </View>
        )}

        {/* Reply (if not mine) */}
        {!isMine && (
          <View style={vw.replyBar}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.white} />
            <Text style={vw.replyText}>Toque para responder...</Text>
          </View>
        )}
      </View>
    </Modal>
  )
}

const vw = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  image: { ...StyleSheet.absoluteFillObject },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },

  progressBars: {
    position: 'absolute', top: 36, left: spacing.md, right: spacing.md,
    flexDirection: 'row', gap: 4, zIndex: 5,
  },
  progressTrack: {
    flex: 1, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressFill: { height: 3, backgroundColor: colors.white },

  authorRow: {
    position: 'absolute', top: 52, left: spacing.md, right: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    zIndex: 5,
  },
  authorLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  authorAvatar: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 2, borderColor: colors.white,
  },
  avatarInitial: { ...typography.label, color: colors.white, fontWeight: '700' },
  authorName: { ...typography.label, color: colors.white, fontWeight: '700' },
  authorSub: { ...typography.caption, color: 'rgba(255,255,255,0.85)' },
  authorActions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },

  tapLeft: { position: 'absolute', top: 100, bottom: 100, left: 0, width: SCREEN_W * 0.3, zIndex: 4 },
  tapRight: { position: 'absolute', top: 100, bottom: 100, right: 0, width: SCREEN_W * 0.7, zIndex: 4 },

  captionWrap: {
    position: 'absolute', bottom: 110, left: 0, right: 0,
    paddingHorizontal: spacing.lg,
    zIndex: 3,
  },
  caption: {
    ...typography.h4, color: colors.white,
    textAlign: 'center', lineHeight: 26,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  replyBar: {
    position: 'absolute', bottom: 36, left: spacing.md, right: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    zIndex: 3,
  },
  replyText: { ...typography.body, color: 'rgba(255,255,255,0.9)' },
})

// ─── Stories Bar ──────────────────────────────────────────────────────────────

export function StoriesBar() {
  const { data: stories, isLoading } = useStories()
  const user = useAuthStore((s) => s.user)
  const [composerUri, setComposerUri] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [startIdx, setStartIdx] = useState(0)

  // Group stories by author
  const groups = useMemo<Group[]>(() => {
    if (!stories?.length) return []
    const map = new Map<string, Group>()
    for (const s of stories) {
      const id = s.author?.id ?? s.author?.username
      if (!id) continue
      if (!map.has(id)) {
        map.set(id, { authorId: id, author: s.author, items: [] })
      }
      map.get(id)!.items.push(s)
    }
    // Put me first if I have a story, then others by most recent first item
    const arr = [...map.values()]
    arr.sort((a, b) => {
      if (a.authorId === user?.id) return -1
      if (b.authorId === user?.id) return 1
      return new Date((b.items[0] as any).createdAt).getTime() - new Date((a.items[0] as any).createdAt).getTime()
    })
    return arr
  }, [stories, user?.id])

  const myGroup = groups.find((g) => g.authorId === user?.id)
  const othersGroups = groups.filter((g) => g.authorId !== user?.id)

  const handleAdd = async () => {
    const uri = await choosePhotoSource()
    if (uri) setComposerUri(uri)
  }

  const openMyStory = () => {
    if (!myGroup) return
    const idx = groups.findIndex((g) => g.authorId === user?.id)
    setStartIdx(idx >= 0 ? idx : 0)
    setViewerOpen(true)
  }

  const openGroup = (groupIdx: number) => {
    setStartIdx(groupIdx)
    setViewerOpen(true)
  }

  return (
    <>
      <StoryComposer
        visible={!!composerUri}
        photoUri={composerUri}
        onClose={() => setComposerUri(null)}
      />
      {viewerOpen && groups.length > 0 && (
        <StoryViewer
          groups={groups}
          startGroupIdx={startIdx}
          onClose={() => setViewerOpen(false)}
        />
      )}

      <View style={sb.wrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={sb.scroll}
        >
          {/* My story card */}
          <TouchableOpacity
            style={sb.item}
            onPress={myGroup ? openMyStory : handleAdd}
            onLongPress={handleAdd}
          >
            <View style={sb.ringWrap}>
              {myGroup ? (
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  style={sb.ring}
                >
                  {user?.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} style={sb.avatar} />
                  ) : (
                    <View style={[sb.avatar, sb.avatarFb]}>
                      <Text style={sb.initial}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                  )}
                </LinearGradient>
              ) : (
                <View style={[sb.ring, sb.addRing]}>
                  {user?.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} style={sb.avatar} />
                  ) : (
                    <View style={[sb.avatar, sb.avatarFb]}>
                      <Text style={sb.initial}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity style={sb.addBadge} onPress={handleAdd} hitSlop={6}>
                <Ionicons name="add" size={14} color={colors.white} />
              </TouchableOpacity>
            </View>
            <Text style={sb.label} numberOfLines={1}>
              {myGroup ? 'Seu story' : 'Adicionar'}
            </Text>
          </TouchableOpacity>

          {isLoading && (
            <ActivityIndicator color={colors.primary} style={{ marginLeft: spacing.md, alignSelf: 'center' }} />
          )}

          {/* Other users' stories */}
          {othersGroups.map((g) => {
            const groupIdx = groups.findIndex((x) => x.authorId === g.authorId)
            return (
              <TouchableOpacity key={g.authorId} style={sb.item} onPress={() => openGroup(groupIdx)}>
                <LinearGradient
                  colors={['#fdb44b', '#f97316', '#dc2626']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={sb.ring}
                >
                  {g.author.avatarUrl ? (
                    <Image source={{ uri: g.author.avatarUrl }} style={sb.avatar} />
                  ) : (
                    <View style={[sb.avatar, sb.avatarFb]}>
                      <Text style={sb.initial}>{g.author.name?.[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                  )}
                </LinearGradient>
                <Text style={sb.label} numberOfLines={1}>
                  {g.author.username ?? 'story'}
                </Text>
                {g.items.length > 1 && (
                  <View style={sb.countBadge}>
                    <Text style={sb.countText}>{g.items.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
    </>
  )
}

const RING = 70
const AV = 60

const sb = StyleSheet.create({
  wrap: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  scroll: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.md },
  item: { alignItems: 'center', width: 72, position: 'relative' },
  ringWrap: { position: 'relative' },
  ring: {
    width: RING, height: RING, borderRadius: RING / 2,
    justifyContent: 'center', alignItems: 'center',
    padding: 3,
  },
  addRing: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, padding: 0 },
  avatar: { width: AV, height: AV, borderRadius: AV / 2, borderWidth: 2.5, borderColor: colors.white },
  avatarFb: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  initial: { ...typography.h3, color: colors.white, fontWeight: '700' },
  addBadge: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: colors.primary,
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: colors.white,
  },
  label: {
    ...typography.caption, color: colors.textSecondary,
    marginTop: 4, maxWidth: 72, fontWeight: '600',
    textAlign: 'center',
  },
  countBadge: {
    position: 'absolute', top: -2, right: 4,
    backgroundColor: colors.error,
    minWidth: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: colors.white,
  },
  countText: { fontSize: 10, color: colors.white, fontWeight: '800' },
})
