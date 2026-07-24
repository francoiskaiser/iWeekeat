import { useTheme } from '@/context/ThemeContext';

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
  };
}
