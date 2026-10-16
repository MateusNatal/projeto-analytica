import { useCallback, useEffect, useState } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Campaign } from "../types/campaign"

import {
  deleteDataset,
  DatasetServiceError,
  listDatasets,
  loadDatasetCampaigns,
  saveDataset,
  type DatasetFormat,
  type SavedDataset,
} from "../services/datasetService"

interface SavedDatasetsProps {
  client: SupabaseClient
  userId: string
  campaigns: Campaign[]
  dataSource: string
  dataFormat: DatasetFormat
  alreadySaved: boolean
  onLoad: (campaigns: Campaign[], dataset: SavedDataset) => void
  onSaved: () => void
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
})

function errorMessage(caught: unknown): string {
  return caught instanceof DatasetServiceError
    ? caught.message
    : "Algo deu errado. Tente novamente."
}

function SavedDatasets({
  client,
  userId,
  campaigns,
  dataSource,
  dataFormat,
  alreadySaved,
  onLoad,
  onSaved,
}: SavedDatasetsProps) {
  const [datasets, setDatasets] = useState<SavedDataset[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(
    null
  )

  const refresh = useCallback(async () => {
    try {
      setDatasets(await listDatasets(client))
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    // Carrega o histórico ao entrar ou ao trocar de usuário.
    let active = true

    listDatasets(client)
      .then((list) => {
        if (active) {
          setDatasets(list)
          setError(null)
        }
      })
      .catch((caught) => active && setError(errorMessage(caught)))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [client, userId])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setNotice(null)

    try {
      await action()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const canSave =
    dataFormat !== "sample" && campaigns.length > 0 && !alreadySaved

  const saveHint =
    dataFormat === "sample"
      ? "Importe um CSV para poder salvar."
      : alreadySaved
        ? "Este arquivo já está salvo."
        : undefined

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Meus arquivos salvos</h2>
          <p className="muted small">
            Ficam guardados na sua conta e só você tem acesso.
          </p>
        </div>

        <button
          type="button"
          className="button button-primary"
          disabled={!canSave || busy}
          title={saveHint}
          onClick={() =>
            run(async () => {
              await saveDataset(client, dataSource, dataFormat, campaigns)
              setNotice(`"${dataSource}" foi salvo.`)
              onSaved()
              await refresh()
            })
          }
        >
          Salvar arquivo atual
        </button>
      </div>

      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="muted small">Carregando…</p>
      ) : datasets.length === 0 ? (
        <p className="empty-state">
          Nenhum arquivo salvo ainda. Importe um CSV e clique em “Salvar
          arquivo atual”.
        </p>
      ) : (
        <ul className="dataset-list">
          {datasets.map((dataset) => (
            <li key={dataset.id} className="dataset">
              <div>
                <strong>{dataset.name}</strong>
                <p className="muted small">
                  {dataset.campaignCount} campanha(s) · salvo em{" "}
                  {dateFormatter.format(new Date(dataset.createdAt))}
                </p>
              </div>

              <div className="dataset-actions">
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const loaded = await loadDatasetCampaigns(
                        client,
                        dataset.id
                      )
                      onLoad(loaded, dataset)
                    })
                  }
                >
                  Abrir
                </button>

                {confirmingDelete === dataset.id ? (
                  <>
                    <button
                      type="button"
                      className="button button-danger"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await deleteDataset(client, dataset.id)
                          setConfirmingDelete(null)
                          setNotice(`"${dataset.name}" foi excluído.`)
                          await refresh()
                        })
                      }
                    >
                      Confirmar exclusão
                    </button>

                    <button
                      type="button"
                      className="button"
                      onClick={() => setConfirmingDelete(null)}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="button"
                    disabled={busy}
                    onClick={() => setConfirmingDelete(dataset.id)}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default SavedDatasets
