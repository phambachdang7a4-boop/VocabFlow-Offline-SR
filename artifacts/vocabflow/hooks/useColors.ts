import { useAppearance } from '@/contexts/AppearanceContext';
import colors from '@/constants/colors';

export function useColors() {
  const { mode } = useAppearance();
  const palette = mode === 'dark' ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
