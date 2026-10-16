import { useActiveSection } from "../hooks/useActiveSection"

import Icon, { type IconName } from "./ui/Icon"

interface NavItem {
  id: string
  label: string
  // Rótulo curto da navegação inferior do celular
  short?: string
  icon: IconName
}

const NAV_ITEMS: NavItem[] = [
  { id: "dados", label: "Dados", icon: "database" },
  { id: "visao-geral", label: "Visão geral", short: "Visão", icon: "overview" },
  { id: "insights", label: "Insights", icon: "lightbulb" },
  { id: "graficos", label: "Gráficos", icon: "chart" },
  { id: "campanhas", label: "Campanhas", icon: "table" },
  { id: "analise-ia", label: "IA", icon: "sparkles" },
]

// Barra lateral no desktop, só ícones no tablet e, no celular, barra superior
// com a logo e navegação inferior (ver layout.css).
function Sidebar() {
  const active = useActiveSection(NAV_ITEMS.map((item) => item.id))

  return (
    <aside className="sidebar">
      <a className="sidebar-brand" href="#dados" aria-label="Analytica, ir para o início">
        <img
          className="sidebar-logo"
          src="/brand/analytica-logo.png"
          alt=""
          width={196}
          height={47}
        />
        <img
          className="sidebar-mark"
          src="/brand/analytica-icon-256.png"
          alt=""
          width={44}
          height={44}
        />
      </a>

      <nav className="sidebar-nav" aria-label="Seções do painel">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <a
                className="nav-link"
                href={`#${item.id}`}
                aria-current={active === item.id ? "true" : undefined}
                title={item.label}
              >
                <Icon name={item.icon} />
                <span className="nav-label">{item.label}</span>
                <span className="nav-label-short" aria-hidden="true">
                  {item.short ?? item.label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <p className="sidebar-footer">Dados que geram resultados</p>
    </aside>
  )
}

export default Sidebar
