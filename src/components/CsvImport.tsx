import { useState, type ChangeEvent } from "react"

import type { CSVFormat, CSVImportResult } from "../types/campaign"

import { CSVImportError, parseCampaignCSV } from "../services/csvParser"

interface CsvImportProps {
  dataSource: string
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

function CsvImport({ dataSource, onImport, onUseSample }: CsvImportProps) {
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
    <section className="panel csv-import">
      <div className="panel-header">
        <div>
          <h2>Seus dados</h2>
          <p className="muted">
            Fonte atual: <strong>{dataSource}</strong>
          </p>
        </div>

        <div className="csv-import-actions">
          <label className="button button-primary">
            {loading ? "Importando…" : "Importar CSV"}
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv"
              onChange={handleFileChange}
              disabled={loading}
              hidden
            />
          </label>

          <button
            type="button"
            className="button"
            onClick={handleUseSample}
          >
            Usar dados de exemplo
          </button>
        </div>
      </div>

      <p className="muted small">
        Aceita exportações do Meta Ads e do Google Ads ou o modelo da
        Analytica. Os dados são lidos no seu navegador e não são enviados para
        nenhum servidor. Baixe um exemplo:{" "}
        {SAMPLE_FILES.map((sample, index) => (
          <span key={sample.href}>
            {index > 0 && " · "}
            <a href={sample.href} download>
              {sample.label}
            </a>
          </span>
        ))}
      </p>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {result && (
        <div className="alert alert-success" role="status">
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
        </div>
      )}
    </section>
  )
}

export default CsvImport
