import { useCallback, useState } from "react"

export type Theme = "dark" | "light"

export const THEME_STORAGE_KEY = "analytica-theme"

const THEME_COLOR: Record<Theme, string> = {
  dark: "#020a1e",
  light: "#eef2fb",
}

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark"
}

// Aplica o tema no <html>. O index.html já faz isso antes do React carregar,
// para não piscar o tema errado ao abrir a página.
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[theme])

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Navegação privada ou armazenamento bloqueado: o tema vale só nesta visita.
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  const toggleTheme = useCallback(() => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark"
    applyTheme(next)
    setTheme(next)
  }, [])

  return { theme, toggleTheme }
}
