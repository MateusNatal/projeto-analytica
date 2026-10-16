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

## 🔐 Login e histórico (Supabase)

O login e o histórico de arquivos são opcionais: sem as variáveis abaixo, o app funciona normalmente, só sem essas funções.

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Rode as migrações de `supabase/migrations/`, **em ordem** (cole no **SQL Editor** ou use `supabase db push`):
   - `20261016000000_initial_schema.sql`: tabelas `datasets` e `campaigns`, com Row Level Security (cada usuário só acessa os próprios dados).
   - `20261016010000_ai_usage.sql`: tabela `ai_usage`, usada no limite diário da IA.
   - `20261016020000_revoke_unused_privileges.sql`: remove do papel `authenticated` as permissões `TRUNCATE`, `REFERENCES` e `TRIGGER` herdadas do Supabase. O `TRUNCATE` ignora o RLS e poderia apagar dados de todos os usuários; o app não usa nenhuma das três.

   Nenhuma delas apaga dados.
3. Em **Authentication → URL Configuration**, defina a *Site URL* como a URL de produção (ex.: `https://projeto-analytica.vercel.app`) e adicione `http://localhost:5173` em *Redirect URLs*.
4. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Project Settings → API). Na Vercel, cadastre as mesmas variáveis e faça um novo deploy.

A chave `anon`/*publishable* é pública por design; quem protege os dados são as políticas de RLS, testadas em `tests/supabaseRls.test.ts` com um Postgres embutido (PGlite). A chave `service_role` **nunca** deve ir para o frontend.

O login usa link mágico por e-mail. O serviço de e-mail padrão do Supabase tem limite baixo de envios por hora; para uso real, configure um SMTP próprio em **Authentication → SMTP Settings**.

---

## 🤖 Análise com IA (Gemini)

A análise com IA roda só no servidor, na função `api/insights.ts` (Vercel Functions), usando o SDK oficial [`@google/genai`](https://www.npmjs.com/package/@google/genai). A chave do Gemini nunca vai para o navegador.

- Exige login no Supabase: o token do usuário é validado no Supabase Auth.
- Limite diário por usuário (`AI_DAILY_LIMIT`, padrão 20), registrado na tabela `ai_usage` (migração `20261016010000_ai_usage.sql`). O usuário não consegue apagar o próprio histórico de uso.
- As métricas são recalculadas no servidor; o modelo recebe só nomes e números das campanhas exibidas, e o usuário é avisado disso antes de gerar.
- A resposta é pedida em JSON estruturado (`responseJsonSchema`) e validada antes de chegar à tela.
- Se a cota do plano gratuito acabar (erro 429 do Google), o usuário vê um aviso específico.

**Modelo padrão:** `gemini-3.5-flash-lite`, estável e com nível gratuito segundo a [página de preços](https://ai.google.dev/gemini-api/docs/pricing) e a [lista de modelos](https://ai.google.dev/gemini-api/docs/models) (consultadas em outubro de 2026). Os limites do plano gratuito por minuto e por dia aparecem no [AI Studio](https://aistudio.google.com/rate-limit).

> ⚠️ **Privacidade no plano gratuito:** segundo a página de preços do Google, os dados enviados no nível gratuito são usados para melhorar os produtos do Google. Por isso o app avisa o usuário antes de gerar a análise. Para dados sensíveis, ative o faturamento no projeto do Google AI Studio.

Configuração na Vercel (**Project Settings → Environment Variables**):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `GEMINI_API_KEY` | sim | Chave da Gemini API (Google AI Studio → *Get API key*). **Sem** prefixo `VITE_`. |
| `GEMINI_MODEL` | não | Modelo usado (padrão `gemini-3.5-flash-lite`). |
| `GEMINI_THINKING_LEVEL` | não | `minimal`, `low` (padrão), `medium` ou `high`; vazio usa o padrão do modelo. O `gemini-3.8-flash` não aceita `minimal`. |
| `AI_DAILY_LIMIT` | não | Análises por usuário em 24 horas (padrão 20). |

A função também usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (ou `SUPABASE_URL` e `SUPABASE_ANON_KEY`) para validar o login.

O `npm run dev` do Vite não executa as funções de `api/`. Para testar a IA localmente, use `npx vercel dev`.

---

## 🚀 Deploy (Vercel)

O projeto está configurado para a Vercel via `vercel.json`:

- **Install:** `npm ci`
- **Build:** `npm test && npm run build` (o deploy não acontece se algum teste falhar)
- **Saída:** `dist/`
- Rotas do frontend caem em `index.html` (SPA); caminhos `/api/*` ficam reservados para funções de backend.

Para publicar: importe o repositório do GitHub em [vercel.com/new](https://vercel.com/new). A cada push na `main` a Vercel gera um deploy de produção, e cada pull request recebe uma URL de preview.

> Segredos (chaves de API etc.) nunca devem ir para o código nem para variáveis `VITE_*`, que são embutidas no JavaScript enviado ao navegador. Configure-os em **Project Settings → Environment Variables** na Vercel.
