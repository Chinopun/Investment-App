import { Tabs } from 'expo-router';
import { useTheme } from '../../lib/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgRaised,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.bgRaised },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.accent,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Portfolio' }} />
      <Tabs.Screen name="news" options={{ title: 'News' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
