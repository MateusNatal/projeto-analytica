import type { ReactNode } from "react"

import Icon from "./ui/Icon"

interface HeaderProps {
  dataSource: string
  // Ações do topo: login/cadastro (ou menu da conta) e tema.
  children?: ReactNode
}

function Header({ dataSource, children }: HeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        <h1>Painel de campanhas</h1>
        <p>
          Entenda suas campanhas de marketing digital sem precisar ser
          especialista.
        </p>
        <span className="source-chip" title={dataSource}>
          <Icon name="file" />
          Fonte: <strong>{dataSource}</strong>
        </span>
      </div>

      {children && <div className="top-actions">{children}</div>}
    </header>
  )
}

export default Header
