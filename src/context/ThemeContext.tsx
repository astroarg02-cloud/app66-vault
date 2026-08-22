import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeMode } from '../types';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: true,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('vault_app_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // fallback
    }
    return 'dark';
  });

  useEffect(() => {
    try {
      localStorage.setItem('vault_app_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
