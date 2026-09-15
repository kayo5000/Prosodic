/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  // useColorScheme() can return null (RN docs) when the OS hasn't reported
  // a preference yet — 'unspecified' was never a value it actually
  // returns, so that check let a null scheme index Colors with null and
  // crash on the very first render. Default to light for anything but an
  // explicit 'dark'.
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}
