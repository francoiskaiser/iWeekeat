import { useTheme } from '@/context/ThemeContext';
import { palette } from '@/constants/theme';

export function useThemeColors() {
  const { isDarkMode } = useTheme();
  return {
    isDarkMode,
    background: isDarkMode ? '#1e293b' : '#FFFBF5',
    text: isDarkMode ? '#f8fafc' : '#1e293b',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? '#334155' : '#fff',
    border: isDarkMode ? '#475569' : '#f1f5f9',
    track: isDarkMode ? '#475569' : '#f1f5f9',
    // Couleurs d'accent lisibles sur le fond du theme (voir constants/theme.ts).
    accent: palette(isDarkMode).accentText,
    successText: palette(isDarkMode).successText,
    placeholder: palette(isDarkMode).placeholder,
  };
}
