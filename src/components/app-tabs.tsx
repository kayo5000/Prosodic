import { Platform, View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Compass, PenTool, Library } from 'lucide-react-native';

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#CC8800',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView 
            tint="dark" 
            intensity={40} 
            style={StyleSheet.absoluteFill} 
          />
        ),
      }}
    >
      <Tabs.Screen
        name="my-songs"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color }) => <Library size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Studio',
          tabBarIcon: ({ color }) => <PenTool size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Compass size={22} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: '50%',
    transform: [{ translateX: -100 }], // roughly center 200px width
    width: 200,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(28, 28, 30, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    elevation: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 0, // override default SafeArea padding
  },
});
