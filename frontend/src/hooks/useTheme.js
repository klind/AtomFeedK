import { useState, useEffect } from 'react';

/**
 * Custom hook for managing dark/light theme using Tailwind's dark mode
 * @returns {Object} - Theme state and toggle function
 */
export const useTheme = () => {
  // Initialize state from localStorage or system preference
  const [darkMode, setDarkMode] = useState(() => {
    // First check localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    
    // Then check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply dark mode class to html when the state changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save preference to localStorage
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Function to toggle dark mode
  const toggleTheme = () => {
    setDarkMode(prevMode => !prevMode);
  };

  return { darkMode, toggleTheme };
}; 