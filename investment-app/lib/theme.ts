import { useColorScheme } from 'react-native';
import { useThemeMode } from '../store/theme';

export type Palette = {
  bg: string;            // page background
  bgRaised: string;      // tab bar, headers — slightly above bg in dark mode
  card: string;          // each list item / card
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;        // standard divider
  borderLight: string;   // subtler divider inside cards
  accent: string;        // iOS blue
  pos: string;           // green for gains
  neg: string;           // red for losses
  inputBg: string;
  inputBorder: string;
  pillBg: string;
  pillText: string;
  pillBgOn: string;
  pillTextOn: string;
  shadow: string;        // for FAB / floating elements
};

const light: Palette = {
  bg: '#f8f9fb',
  bgRaised: '#ffffff',
  card: '#ffffff',
  text: '#111111',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#e2e4e9',
  borderLight: '#eef0f4',
  accent: '#0a84ff',
  pos: '#0a8a3f',
  neg: '#c83a3a',
  inputBg: '#ffffff',
  inputBorder: '#dcdfe5',
  pillBg: '#eef0f4',
  pillText: '#444444',
  pillBgOn: '#0a84ff',
  pillTextOn: '#ffffff',
  shadow: '#000000',
};

const dark: Palette = {
  bg: '#000000',
  bgRaised: '#1c1c1e',
  card: '#1c1c1e',
  text: '#ffffff',
  textSecondary: '#aeaeb2',
  textMuted: '#8e8e93',
  border: '#2c2c2e',
  borderLight: '#26272a',
  accent: '#0a84ff',
  pos: '#30d158',
  neg: '#ff453a',
  inputBg: '#1c1c1e',
  inputBorder: '#3a3a3c',
  pillBg: '#2c2c2e',
  pillText: '#e5e5e7',
  pillBgOn: '#0a84ff',
  pillTextOn: '#ffffff',
  shadow: '#000000',
};

export function useTheme(): { colors: Palette; isDark: boolean } {
  const system = useColorScheme();
  const mode = useThemeMode((s) => s.mode);
  const effective = mode === 'system' ? (system ?? 'light') : mode;
  const isDark = effective === 'dark';
  return { colors: isDark ? dark : light, isDark };
}
