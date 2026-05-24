import { Tabs, Redirect } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/auth.js'
import { colors } from '../../constants/theme.js'

function TabBarIcon({ name, color }: { name: React.ComponentProps<typeof Ionicons>['name']; color: string }) {
  return <Ionicons name={name} size={24} color={color} />
}

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Mercado',
          tabBarIcon: ({ color }) => <TabBarIcon name="trending-up-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AgroIA',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.aiTab, focused && styles.aiTabActive]}>
              <TabBarIcon name="sparkles" color={focused ? colors.white : colors.primary} />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="vagas"
        options={{
          title: 'Vagas',
          tabBarIcon: ({ color }) => <TabBarIcon name="briefcase-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Loja',
          tabBarIcon: ({ color }) => <TabBarIcon name="storefront-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <TabBarIcon name="person-outline" color={color} />,
        }}
      />
      {/* Reached via header icons, hidden from tab bar */}
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="offers" options={{ href: null }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  aiTab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiTabActive: { backgroundColor: colors.primary },
})
