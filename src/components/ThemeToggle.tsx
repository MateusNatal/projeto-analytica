import { useTheme } from "../hooks/useTheme"

import Icon from "./ui/Icon"

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const nextLabel = theme === "dark" ? "Tema claro" : "Tema escuro"

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Ativar ${nextLabel.toLowerCase()}`}
      title={`Ativar ${nextLabel.toLowerCase()}`}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} />
      <span className="theme-toggle-label">{nextLabel}</span>
    </button>
  )
}

export default ThemeToggle
