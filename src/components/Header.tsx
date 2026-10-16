function Header() {
  return (
    <header className="app-header">
      <div className="brand">
        <img
          className="brand-mark"
          src="/brand/analytica-icon-256.png"
          alt=""
          width={48}
          height={48}
        />

        <div>
          <h1 className="brand-name">Analytica</h1>
          <p className="brand-tagline">Dados que geram resultados</p>
        </div>
      </div>

      <p className="app-header-description">
        Entenda suas campanhas de marketing digital sem precisar ser especialista.
      </p>
    </header>
  )
}

export default Header
