import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/state/AuthContext';
import { AppNavigator } from './src/navigators/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="light" />
    </AuthProvider>
  );
}
