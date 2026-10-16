import { describe, expect, it } from "vitest"

import {
  CSVImportError,
  decodeFileContent,
  MAX_FILE_SIZE_BYTES,
  parseCampaignCSV,
  parseCampaignText,
} from "../src/services/csvParser"

import type { NumericField } from "../src/services/campaignMapper"
import type { Campaign } from "../src/types/campaign"

import { readSample } from "./helpers"

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer
}

function utf16le(text: string): Uint8Array {
  const bytes = new Uint8Array(2 + text.length * 2)
  bytes[0] = 0xff
  bytes[1] = 0xfe

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    bytes[2 + i * 2] = code & 0xff
    bytes[3 + i * 2] = code >> 8
  }

  return bytes
}

// Codifica em Windows-1252 (válido para os caracteres acentuados usados aqui).
function windows1252(text: string): Uint8Array {
  return Uint8Array.from([...text].map((char) => char.charCodeAt(0)))
}

function sum(campaigns: Campaign[], field: NumericField): number {
  return campaigns.reduce((total, campaign) => total + campaign[field], 0)
}

function parseSample(name: string) {
  return parseCampaignText(readSample(name).toString("utf8"))
}

describe("decodeFileContent", () => {
  const text = "Campanha;Investimento\nPromoção;10"

  it("lê UTF-8", () => {
    const bytes = new TextEncoder().encode(text)
    expect(decodeFileContent(toArrayBuffer(bytes))).toBe(text)
  })

  it("lê UTF-16 com BOM, comum em exportações do Excel e do Google Ads", () => {
    expect(decodeFileContent(toArrayBuffer(utf16le(text)))).toBe(text)
  })

  it("recorre ao Windows-1252 quando o UTF-8 é inválido", () => {
    expect(decodeFileContent(toArrayBuffer(windows1252(text)))).toBe(text)
  })
})

describe("arquivos de exemplo", () => {
  it("importa o modelo da Analytica (ponto e vírgula e números brasileiros)", () => {
    const result = parseSample("modelo-analytica.csv")

    expect(result.format).toBe("analytica")
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.campaigns).toHaveLength(5)
    expect(result.campaigns[0]).toEqual({
      id: 1,
      name: "Black Friday",
      platform: "Instagram Ads",
      investment: 2000,
      impressions: 50000,
      clicks: 1250,
      conversions: 83,
      revenue: 8500,
    })
  })

  it("importa o Meta Ads e soma linhas da mesma campanha", () => {
    const result = parseSample("meta-ads-exemplo.csv")

    expect(result.format).toBe("meta")
    expect(result.rowsRead).toBe(4)
    expect(result.mergedRows).toBe(1)
    expect(result.campaigns).toHaveLength(3)

    const [primavera] = result.campaigns

    expect(primavera.name).toBe("Coleção Primavera")
    expect(primavera.platform).toBe("Meta Ads")
    expect(primavera.investment).toBeCloseTo(1895.75)
    expect(primavera.impressions).toBe(58142)
    expect(primavera.clicks).toBe(1357)
    expect(primavera.conversions).toBe(78)
    expect(primavera.revenue).toBeCloseTo(8101)
  })

  it("importa o Google Ads ignorando títulos e linhas de total", () => {
    const result = parseSample("google-ads-exemplo.csv")

    expect(result.format).toBe("google")
    expect(result.errors).toEqual([])
    expect(result.campaigns.map((campaign) => campaign.name)).toEqual([
      "Pesquisa - Marca",
      "Pesquisa - Genérica",
      "Display - Prospecção",
      "Performance Max - Total Flex",
    ])
  })

  it("Google Ads: a soma bate com a linha \"Total: conta\" do arquivo", () => {
    const { campaigns } = parseSample("google-ads-exemplo.csv")

    expect(sum(campaigns, "investment")).toBeCloseTo(2994.55)
    expect(sum(campaigns, "impressions")).toBe(306980)
    expect(sum(campaigns, "clicks")).toBe(3977)
    expect(sum(campaigns, "conversions")).toBeCloseTo(154.5)
    expect(sum(campaigns, "revenue")).toBeCloseTo(15060)
  })

  it("Google Ads: \"--\" vira zero", () => {
    const { campaigns } = parseSample("google-ads-exemplo.csv")

    const display = campaigns.find(
      (campaign) => campaign.name === "Display - Prospecção"
    )

    expect(display?.conversions).toBe(0)
    expect(display?.revenue).toBe(0)
  })

  it("importa Google Ads em UTF-16 separado por tabulação", async () => {
    const tsv = [
      "Relatório de campanha",
      "Campanha\tImpr.\tCliques\tCusto\tConversões\tValor conv.",
      "Marca\t12.480\t1.310\t534,20\t96,00\t9.120,00",
      "Total: conta\t12.480\t1.310\t534,20\t96,00\t9.120,00",
    ].join("\r\n")

    const file = new File([toArrayBuffer(utf16le(tsv))], "google.csv")
    const result = await parseCampaignCSV(file)

    expect(result.campaigns).toEqual([
      {
        id: 1,
        name: "Marca",
        platform: "Google Ads",
        investment: 534.2,
        impressions: 12480,
        clicks: 1310,
        conversions: 96,
        revenue: 9120,
      },
    ])
  })

  it("importa arquivo em Windows-1252", async () => {
    const text =
      "Campanha;Investimento;Impressões;Cliques\nPromoção Verão;1.234,56;10.000;250\n"

    const file = new File([toArrayBuffer(windows1252(text))], "latin.csv")
    const result = await parseCampaignCSV(file)

    expect(result.campaigns[0].name).toBe("Promoção Verão")
    expect(result.campaigns[0].investment).toBeCloseTo(1234.56)
  })
})

describe("dados problemáticos", () => {
  const header = "Campanha;Investimento;Impressões;Cliques"

  it("ignora linhas inválidas e informa a linha de cada problema", () => {
    const result = parseCampaignText(
      [
        header,
        "Ok;100,00;1000;50",
        "Ruim;abc;1000;50",
        "Negativa;-5;1000;50",
        ";10;10;1",
      ].join("\n")
    )

    expect(result.campaigns.map((campaign) => campaign.name)).toEqual(["Ok"])
    expect(result.errors).toEqual([
      { line: 3, message: 'Investimento com valor inválido ("abc").' },
      { line: 4, message: "O investimento não pode ser negativo." },
      { line: 5, message: "O nome da campanha está vazio." },
    ])
  })

  it("avisa quando faltam colunas opcionais", () => {
    const { warnings } = parseCampaignText(`${header}\nA;10;100;5`)

    expect(warnings).toHaveLength(2)
    expect(warnings[0]).toMatch(/conversões/)
    expect(warnings[1]).toMatch(/receita/)
  })

  it("avisa quando há mais cliques que impressões", () => {
    const { warnings } = parseCampaignText(`${header}\nA;10;100;500`)

    expect(warnings.some((warning) => warning.includes("mais cliques"))).toBe(
      true
    )
  })

  it("mantém campanhas cujo nome começa com Total", () => {
    const { campaigns } = parseCampaignText(`${header}\nTotal Flex;10;100;5`)

    expect(campaigns[0].name).toBe("Total Flex")
  })

  it("lê números americanos com vírgula de milhar", () => {
    const { campaigns } = parseCampaignText(
      'Campaign,Cost,Impressions,Clicks\nA,"1,234.50","12,000",300\nB,99.9,800,20'
    )

    expect(campaigns.map((campaign) => campaign.investment)).toEqual([
      1234.5, 99.9,
    ])
    expect(campaigns[0].impressions).toBe(12000)
  })

  it.each([
    ["arquivo vazio", "\n\n", /vazio/],
    ["sem cabeçalho reconhecível", "foo,bar\n1,2", /cabeçalho/],
    [
      "coluna obrigatória ausente",
      "Campanha,Cliques\nA,10",
      /Investimento.*Impressões/,
    ],
    [
      "nenhuma linha válida",
      `${header}\nA;abc;1;1`,
      /Nenhuma linha válida.*linha 2/,
    ],
    ["só o cabeçalho", header, /não tem linhas/],
  ])("%s gera erro claro", (_label, text, message) => {
    expect(() => parseCampaignText(text)).toThrow(CSVImportError)
    expect(() => parseCampaignText(text)).toThrow(message)
  })
})

describe("parseCampaignCSV", () => {
  it("recusa extensões não suportadas", async () => {
    await expect(
      parseCampaignCSV(new File(["x"], "planilha.xlsx"))
    ).rejects.toThrow(/Formato não suportado/)
  })

  it("recusa arquivos maiores que o limite", async () => {
    const file = new File(
      [new Uint8Array(MAX_FILE_SIZE_BYTES + 1)],
      "grande.csv"
    )

    await expect(parseCampaignCSV(file)).rejects.toThrow(/5 MB/)
  })
})
