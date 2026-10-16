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

import { Alert, Button, EmptyState, IconTile, Skeleton } from "./ui/primitives"
import { useToast } from "./ui/toastContext"

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

// Ação em andamento, para mostrar o carregamento no botão certo.
type BusyAction = "save" | `open:${string}` | `delete:${string}` | null

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
  const toast = useToast()
  const [datasets, setDatasets] = useState<SavedDataset[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<BusyAction>(null)
  const [error, setError] = useState<string | null>(null)
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

  async function run(action: BusyAction, task: () => Promise<void>) {
    setBusy(action)
    setError(null)

    try {
      await task()
    } catch (caught) {
      const message = errorMessage(caught)
      setError(message)
      toast.show(message, "error")
    } finally {
      setBusy(null)
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
    <section className="panel" aria-labelledby="saved-title">
      <div className="panel-header">
        <div className="section-title">
          <IconTile name="folder" />
          <div>
            <h2 id="saved-title">Meus arquivos salvos</h2>
            <p className="muted small">
              Ficam guardados na sua conta e só você tem acesso.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          icon="save"
          disabled={!canSave || busy !== null}
          loading={busy === "save"}
          title={saveHint}
          onClick={() =>
            run("save", async () => {
              await saveDataset(client, dataSource, dataFormat, campaigns)
              toast.show(`"${dataSource}" foi salvo.`)
              onSaved()
              await refresh()
            })
          }
        >
          Salvar arquivo atual
        </Button>
      </div>

      {saveHint && <p className="muted small">{saveHint}</p>}

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <Skeleton lines={3} label="Carregando arquivos salvos…" />
      ) : datasets.length === 0 ? (
        <EmptyState icon="folder" title="Nenhum arquivo salvo ainda">
          Importe um CSV e clique em “Salvar arquivo atual”.
        </EmptyState>
      ) : (
        <ul className="dataset-list">
          {datasets.map((dataset) => (
            <li key={dataset.id} className="dataset">
              <div className="dataset-info">
                <IconTile name="file" size="sm" />
                <div>
                  <strong title={dataset.name}>{dataset.name}</strong>
                  <p className="muted small">
                    {dataset.campaignCount} campanha(s) · salvo em{" "}
                    {dateFormatter.format(new Date(dataset.createdAt))}
                  </p>
                </div>
              </div>

              <div className="dataset-actions">
                <Button
                  size="sm"
                  icon="open"
                  disabled={busy !== null}
                  loading={busy === `open:${dataset.id}`}
                  onClick={() =>
                    run(`open:${dataset.id}`, async () => {
                      const loaded = await loadDatasetCampaigns(
                        client,
                        dataset.id
                      )
                      onLoad(loaded, dataset)
                      toast.show(`"${dataset.name}" aberto.`)
                    })
                  }
                >
                  Abrir
                </Button>

                {confirmingDelete === dataset.id ? (
                  <>
                    <Button
                      size="sm"
                      variant="danger"
                      icon="trash"
                      disabled={busy !== null}
                      loading={busy === `delete:${dataset.id}`}
                      onClick={() =>
                        run(`delete:${dataset.id}`, async () => {
                          await deleteDataset(client, dataset.id)
                          setConfirmingDelete(null)
                          toast.show(`"${dataset.name}" foi excluído.`)
                          await refresh()
                        })
                      }
                    >
                      Confirmar exclusão
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmingDelete(null)}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="trash"
                    disabled={busy !== null}
                    onClick={() => setConfirmingDelete(dataset.id)}
                  >
                    Excluir
                  </Button>
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
