# Analytica

> Plataforma inteligente para democratização da análise de dados.

O **Analytica** é um projeto acadêmico e de portfólio desenvolvido com o objetivo de tornar a análise de dados mais acessível para pessoas que não possuem conhecimento técnico na área.

A plataforma pretende transformar dados complexos em informações simples, visualizações e insights que possam auxiliar na compreensão e tomada de decisões.

O projeto utiliza como primeiro caso de uso a **análise de campanhas de marketing digital**, permitindo trabalhar com métricas como investimento, cliques, conversões, receita e retorno sobre investimento.

---

## 🎯 Objetivo

Desenvolver uma plataforma capaz de transformar dados de campanhas digitais em informações compreensíveis, utilizando recursos de visualização de dados e, posteriormente, Inteligência Artificial.

A proposta é reduzir a dificuldade encontrada por usuários sem conhecimento técnico para interpretar métricas e identificar informações relevantes em seus dados.

---

## 💡 Problema

Muitas pessoas e pequenos negócios possuem acesso a dados, mas encontram dificuldades para interpretá-los.

Uma tabela contendo centenas de números pode apresentar informações importantes, porém identificar padrões, comparar resultados e compreender indicadores pode exigir conhecimentos específicos de análise de dados.

O Analytica busca simplificar esse processo.

---

## 🚀 Proposta

O sistema será desenvolvido para seguir o fluxo:

```text
Dados
  ↓
Processamento
  ↓
Métricas
  ↓
Visualização
  ↓
Insights
  ↓
Análise com IA
```

---

## 🛠️ Tecnologias

- React 19 + TypeScript
- Vite
- Recharts (gráficos)
- Papa Parse (leitura de CSV)

---

## ▶️ Como rodar localmente

Requisitos: Node.js 24 (ou `^20.19` / `>=22.12`, exigido pelo Vite).

```bash
npm ci          # instala as dependências exatas do package-lock.json
npm run dev     # servidor de desenvolvimento em http://localhost:5173
npm run build   # checagem de tipos + build de produção em dist/
npm run preview # serve o build de produção localmente
npm run lint    # ESLint
npm test        # testes automatizados (Vitest)
```

---

## ✅ Testes

Os testes ficam em `tests/` e cobrem os cálculos das métricas, os totais do painel, a leitura de números em formato brasileiro e americano, a importação de CSV (Meta Ads, Google Ads, modelo próprio, UTF-16 e Windows-1252), a validação, a formatação e os insights automáticos. Os arquivos de `public/exemplos/` são usados como dados de teste.

O GitHub Actions (`.github/workflows/ci.yml`) roda lint, testes e build a cada push e pull request.

---

## 🚀 Deploy (Vercel)

O projeto está configurado para a Vercel via `vercel.json`:

- **Install:** `npm ci`
- **Build:** `npm test && npm run build` (o deploy não acontece se algum teste falhar)
- **Saída:** `dist/`
- Rotas do frontend caem em `index.html` (SPA); caminhos `/api/*` ficam reservados para funções de backend.

Para publicar: importe o repositório do GitHub em [vercel.com/new](https://vercel.com/new). A cada push na `main` a Vercel gera um deploy de produção, e cada pull request recebe uma URL de preview.

> Segredos (chaves de API etc.) nunca devem ir para o código nem para variáveis `VITE_*`, que são embutidas no JavaScript enviado ao navegador. Configure-os em **Project Settings → Environment Variables** na Vercel.
