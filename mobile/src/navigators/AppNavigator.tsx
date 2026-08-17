import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// Import the Ionicons subpath directly, NOT the '@expo/vector-icons'
// barrel — the barrel's IconsLazy.js eagerly pulls in every icon set
// (Octicons, FontAwesome, ...), and one of those font assets doesn't
// resolve in this installed version, 500-ing the whole bundle. Direct
// subpath import also means only the one font we actually use ships.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../state/AuthContext';
import AnalyzeScreen from '../screens/AnalyzeScreen';
import ChatScreen from '../screens/ChatScreen';
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme/theme';
import { linking } from './linking';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

// More screens (Mastery, Notepad/Freewrite/Tools) get added to this tab
// bar as they're built — see mobile/README.md's "Next screens" section.
// Mastery doesn't have one yet on purpose: /mastery is still an honest
// "not ready" stub on the backend (api.py mastery()), so there's no real
// data to build a screen against yet.
const navTheme: Theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.background, card: colors.surface, border: colors.border },
};

type TabName = keyof RootTabParamList;
const TAB_ICONS: Record<TabName, keyof typeof Ionicons.glyphMap> = {
  Analyze: 'pulse',
  Chat: 'chatbubble-ellipses',
  Profile: 'person-circle',
};

// Only Profile is auth-gated (login/logout lives there) — Analyze and
// Chat work for anyone who opens the app, matching the backend exactly:
// /analyze and /suggest don't require auth (verified in api.py), so
// forcing a login wall in front of them would be MORE restrictive than
// the API actually is. Login unlocks personalization (used_before/
// community_uses tagging in /suggest, see api.py) — it's not a gate to
// use the app at all.
function ProfileTab() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }
  return user ? <ProfileScreen /> : <LoginScreen />;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name as TabName]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Analyze" component={AnalyzeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileTab} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <MainTabs />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});
