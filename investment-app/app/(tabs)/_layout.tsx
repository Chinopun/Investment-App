import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0a84ff',
        headerStyle: { backgroundColor: '#f8f9fb' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Portfolio' }} />
      <Tabs.Screen name="news" options={{ title: 'News' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
