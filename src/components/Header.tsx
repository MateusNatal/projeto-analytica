import Icon from "./ui/Icon"

interface HeaderProps {
  dataSource: string
}

function Header({ dataSource }: HeaderProps) {
  return (
    <header className="page-header">
      <div>
        <h1>Painel de campanhas</h1>
        <p>
          Entenda suas campanhas de marketing digital sem precisar ser
          especialista.
        </p>
      </div>

      <span className="source-chip" title={dataSource}>
        <Icon name="file" />
        Fonte: <strong>{dataSource}</strong>
      </span>
    </header>
  )
}

export default Header
