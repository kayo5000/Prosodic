import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// Import the Ionicons subpath directly, NOT the '@expo/vector-icons'
// barrel — the barrel's IconsLazy.js eagerly pulls in every icon set
// (Octicons, FontAwesome, ...), and one of those font assets doesn't
// resolve in this installed version, 500-ing the whole bundle. Direct
// subpath import also means only the one font we actually use ships.
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthProvider, useAuth } from './src/state/AuthContext';
import AnalyzeScreen from './src/screens/AnalyzeScreen';
import ChatScreen from './src/screens/ChatScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { colors } from './src/theme/theme';

const Tab = createBottomTabNavigator();

// More screens (Mastery, Notepad/Freewrite/Tools) get added to this tab
// bar as they're built — see mobile/README.md's "Next screens" section.
// Mastery doesn't have one yet on purpose: /mastery is still an honest
// "not ready" stub on the backend (api.py mastery()), so there's no real
// data to build a screen against yet.
const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.background, card: colors.surface, border: colors.border },
};

const TAB_ICONS = { Analyze: 'pulse', Chat: 'chatbubble-ellipses', Profile: 'person-circle' };

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
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Analyze" component={AnalyzeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileTab} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={navTheme}>
        <MainTabs />
        <StatusBar style="light" />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});
