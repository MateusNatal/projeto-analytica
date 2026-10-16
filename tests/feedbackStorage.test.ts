import { beforeEach, describe, expect, it, vi } from "vitest"

// Simula o localStorage do navegador.
function installStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))

  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  })

  return data
}

async function loadStorage() {
  vi.resetModules()
  return import("../src/services/feedbackStorage")
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe("feedbackStorage", () => {
  it("cria um identificador aleatório e o mantém entre leituras", async () => {
    const data = installStorage()
    const storage = await loadStorage()

    const first = storage.readFeedbackState()
    const second = storage.readFeedbackState()

    expect(first.respondentId).toMatch(/^[0-9a-f-]{36}$/)
    expect(second.respondentId).toBe(first.respondentId)
    expect(JSON.parse(data.get("analytica-feedback") ?? "{}").respondentId).toBe(
      first.respondentId
    )
  })

  it("guarda a resposta do primeiro acesso com data e hora", async () => {
    installStorage()
    const storage = await loadStorage()

    const state = storage.savePreUseAnswer("vague")

    expect(state.preUse?.level).toBe("vague")
    expect(Number.isNaN(Date.parse(state.preUse?.answeredAt ?? ""))).toBe(false)
    expect(storage.readFeedbackState().preUse?.level).toBe("vague")
  })

  it("marca a pergunta inicial como dispensada e a avaliação como enviada", async () => {
    installStorage()
    const storage = await loadStorage()

    storage.dismissPreUse()
    storage.markFeedbackSubmitted()

    expect(storage.readFeedbackState()).toMatchObject({
      preUseDismissed: true,
      submitted: true,
    })
  })

  it("ignora dados corrompidos e começa de novo", async () => {
    installStorage({ "analytica-feedback": "{isto não é json" })
    const storage = await loadStorage()

    expect(storage.readFeedbackState()).toMatchObject({
      preUse: null,
      submitted: false,
    })
  })

  it("funciona em memória quando o armazenamento está bloqueado", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloqueado")
      },
      setItem: () => {
        throw new Error("bloqueado")
      },
    })
    const storage = await loadStorage()

    const id = storage.readFeedbackState().respondentId
    storage.savePreUseAnswer("cannot")

    expect(storage.readFeedbackState()).toMatchObject({
      respondentId: id,
      preUse: { level: "cannot" },
    })
  })
})
