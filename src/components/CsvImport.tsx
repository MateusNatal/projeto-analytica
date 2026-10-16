import { useState, type ChangeEvent } from "react"

import type { CSVFormat, CSVImportResult } from "../types/campaign"

import { CSVImportError, parseCampaignCSV } from "../services/csvParser"

import Icon from "./ui/Icon"
import { Alert, Button, IconTile } from "./ui/primitives"

interface CsvImportProps {
  onImport: (result: CSVImportResult, fileName: string) => void
  onUseSample: () => void
}

const FORMAT_LABELS: Record<CSVFormat, string> = {
  analytica: "Modelo Analytica",
  meta: "Meta Ads",
  google: "Google Ads",
  generic: "Formato genérico",
}

const MAX_LISTED_ERRORS = 5

const SAMPLE_FILES = [
  { href: "/exemplos/modelo-analytica.csv", label: "Modelo Analytica" },
  { href: "/exemplos/meta-ads-exemplo.csv", label: "Exemplo Meta Ads" },
  { href: "/exemplos/google-ads-exemplo.csv", label: "Exemplo Google Ads" },
]

function CsvImport({ onImport, onUseSample }: CsvImportProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CSVImportResult | null>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    // Permite selecionar o mesmo arquivo de novo depois de corrigi-lo.
    event.target.value = ""

    if (!file) {
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const imported = await parseCampaignCSV(file)
      setResult(imported)
      onImport(imported, file.name)
    } catch (caught) {
      setError(
        caught instanceof CSVImportError
          ? caught.message
          : "Não foi possível ler o arquivo. Verifique se ele é um CSV válido."
      )
    } finally {
      setLoading(false)
    }
  }

  function handleUseSample() {
    setError(null)
    setResult(null)
    onUseSample()
  }

  return (
    <section className="panel csv-import" aria-labelledby="csv-import-title">
      <div className="panel-header">
        <div className="section-title">
          <IconTile name="upload" />
          <div>
            <h2 id="csv-import-title">Importar campanhas</h2>
            <p className="muted small">
              Exportações do Meta Ads, do Google Ads ou o modelo da Analytica.
            </p>
          </div>
        </div>

        <div className="csv-import-actions">
          <label
            className="button button-primary"
            aria-disabled={loading || undefined}
          >
            {loading ? (
              <span className="spinner" aria-hidden="true" />
            ) : (
              <Icon name="upload" />
            )}
            {loading ? "Importando…" : "Importar CSV"}
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv"
              onChange={handleFileChange}
              disabled={loading}
              className="visually-hidden"
            />
          </label>

          <Button onClick={handleUseSample} disabled={loading}>
            Usar dados de exemplo
          </Button>
        </div>
      </div>

      <p className="privacy-note">
        <Icon name="shield" />
        Os arquivos são lidos no seu navegador e não são enviados para nenhum
        servidor.
      </p>

      <div className="sample-links" aria-label="Arquivos de exemplo">
        {SAMPLE_FILES.map((sample) => (
          <a
            key={sample.href}
            className="sample-link"
            href={sample.href}
            download
          >
            <Icon name="download" />
            {sample.label}
          </a>
        ))}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {result && (
        <Alert tone="success">
          <p>
            <strong>{result.campaigns.length} campanha(s) importada(s)</strong>{" "}
            ({FORMAT_LABELS[result.format]}, {result.rowsRead} linha(s) lida(s)
            {result.mergedRows > 0 &&
              `, ${result.mergedRows} linha(s) da mesma campanha somadas`}
            ).
          </p>

          {result.warnings.length > 0 && (
            <ul>
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}

          {result.errors.length > 0 && (
            <>
              <p>
                {result.errors.length} problema(s) encontrado(s); as linhas
                afetadas foram ignoradas:
              </p>
              <ul>
                {result.errors.slice(0, MAX_LISTED_ERRORS).map((issue) => (
                  <li key={`${issue.line}-${issue.message}`}>
                    Linha {issue.line}: {issue.message}
                  </li>
                ))}
                {result.errors.length > MAX_LISTED_ERRORS && (
                  <li>
                    … e mais {result.errors.length - MAX_LISTED_ERRORS}.
                  </li>
                )}
              </ul>
            </>
          )}
        </Alert>
      )}
    </section>
  )
}

export default CsvImport
