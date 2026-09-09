/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeStore } from '@/store/theme';

export function useTheme() {
  const system = useColorScheme();
  const pref = useThemeStore((s) => s.preference);
  const resolved = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return Colors[resolved];
}

export function useResolvedTheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const pref = useThemeStore((s) => s.preference);
  if (pref === 'system') return system === 'dark' ? 'dark' : 'light';
  return pref;
}
