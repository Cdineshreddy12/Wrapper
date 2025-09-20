import { useState, useEffect } from 'react'

export type Theme = 'blue' | 'purple' | 'green' | 'orange' | 'pink'

const themeConfig = {
  blue: {
    '--primary-50': '230 100% 99%',
    '--primary-100': '230 100% 97%',
    '--primary-200': '230 100% 94%',
    '--primary-300': '230 100% 89%',
    '--primary-400': '230 100% 80%',
    '--primary-500': '230 100% 70%',
    '--primary-600': '230 100% 60%',
    '--primary-700': '230 100% 50%',
    '--primary-800': '230 100% 40%',
    '--primary-900': '230 100% 30%',
    '--primary-950': '230 100% 20%',
  },
  purple: {
    '--primary-50': '270 100% 99%',
    '--primary-100': '270 100% 97%',
    '--primary-200': '270 100% 94%',
    '--primary-300': '270 100% 89%',
    '--primary-400': '270 100% 80%',
    '--primary-500': '270 100% 70%',
    '--primary-600': '270 100% 60%',
    '--primary-700': '270 100% 50%',
    '--primary-800': '270 100% 40%',
    '--primary-900': '270 100% 30%',
    '--primary-950': '270 100% 20%',
  },
  green: {
    '--primary-50': '120 100% 99%',
    '--primary-100': '120 100% 97%',
    '--primary-200': '120 100% 94%',
    '--primary-300': '120 100% 89%',
    '--primary-400': '120 100% 80%',
    '--primary-500': '120 100% 70%',
    '--primary-600': '120 100% 60%',
    '--primary-700': '120 100% 50%',
    '--primary-800': '120 100% 40%',
    '--primary-900': '120 100% 30%',
    '--primary-950': '120 100% 20%',
  },
  orange: {
    '--primary-50': '25 100% 99%',
    '--primary-100': '25 100% 97%',
    '--primary-200': '25 100% 94%',
    '--primary-300': '25 100% 89%',
    '--primary-400': '25 100% 80%',
    '--primary-500': '25 100% 70%',
    '--primary-600': '25 100% 60%',
    '--primary-700': '25 100% 50%',
    '--primary-800': '25 100% 40%',
    '--primary-900': '25 100% 30%',
    '--primary-950': '25 100% 20%',
  },
  pink: {
    '--primary-50': '320 100% 99%',
    '--primary-100': '320 100% 97%',
    '--primary-200': '320 100% 94%',
    '--primary-300': '320 100% 89%',
    '--primary-400': '320 100% 80%',
    '--primary-500': '320 100% 70%',
    '--primary-600': '320 100% 60%',
    '--primary-700': '320 100% 50%',
    '--primary-800': '320 100% 40%',
    '--primary-900': '320 100% 30%',
    '--primary-950': '320 100% 20%',
  },
}

const darkThemeConfig = {
  blue: {
    '--primary-50': '230 100% 10%',
    '--primary-100': '230 100% 15%',
    '--primary-200': '230 100% 20%',
    '--primary-300': '230 100% 25%',
    '--primary-400': '230 100% 30%',
    '--primary-500': '230 100% 40%',
    '--primary-600': '230 100% 50%',
    '--primary-700': '230 100% 60%',
    '--primary-800': '230 100% 70%',
    '--primary-900': '230 100% 80%',
    '--primary-950': '230 100% 90%',
  },
  purple: {
    '--primary-50': '270 100% 10%',
    '--primary-100': '270 100% 15%',
    '--primary-200': '270 100% 20%',
    '--primary-300': '270 100% 25%',
    '--primary-400': '270 100% 30%',
    '--primary-500': '270 100% 40%',
    '--primary-600': '270 100% 50%',
    '--primary-700': '270 100% 60%',
    '--primary-800': '270 100% 70%',
    '--primary-900': '270 100% 80%',
    '--primary-950': '270 100% 90%',
  },
  green: {
    '--primary-50': '120 100% 10%',
    '--primary-100': '120 100% 15%',
    '--primary-200': '120 100% 20%',
    '--primary-300': '120 100% 25%',
    '--primary-400': '120 100% 30%',
    '--primary-500': '120 100% 40%',
    '--primary-600': '120 100% 50%',
    '--primary-700': '120 100% 60%',
    '--primary-800': '120 100% 70%',
    '--primary-900': '120 100% 80%',
    '--primary-950': '120 100% 90%',
  },
  orange: {
    '--primary-50': '25 100% 10%',
    '--primary-100': '25 100% 15%',
    '--primary-200': '25 100% 20%',
    '--primary-300': '25 100% 25%',
    '--primary-400': '25 100% 30%',
    '--primary-500': '25 100% 40%',
    '--primary-600': '25 100% 50%',
    '--primary-700': '25 100% 60%',
    '--primary-800': '25 100% 70%',
    '--primary-900': '25 100% 80%',
    '--primary-950': '25 100% 90%',
  },
  pink: {
    '--primary-50': '320 100% 10%',
    '--primary-100': '320 100% 15%',
    '--primary-200': '320 100% 20%',
    '--primary-300': '320 100% 25%',
    '--primary-400': '320 100% 30%',
    '--primary-500': '320 100% 40%',
    '--primary-600': '320 100% 50%',
    '--primary-700': '320 100% 60%',
    '--primary-800': '320 100% 70%',
    '--primary-900': '320 100% 80%',
    '--primary-950': '320 100% 90%',
  },
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('blue')
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    
    if (savedTheme) {
      setTheme(savedTheme)
    }
    if (savedDarkMode) {
      setIsDarkMode(savedDarkMode)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const applyTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    
    const root = document.documentElement
    const themeColors = isDarkMode ? darkThemeConfig[newTheme] : themeConfig[newTheme]
    
    Object.entries(themeColors).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })
  }

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode.toString())
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // Reapply theme colors for the new mode
    const themeColors = newDarkMode ? darkThemeConfig[theme] : themeConfig[theme]
    const root = document.documentElement
    
    Object.entries(themeColors).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })
  }

  const changeTheme = (newTheme: Theme) => {
    applyTheme(newTheme)
  }

  return {
    theme,
    isDarkMode,
    changeTheme,
    toggleDarkMode,
  }
}
