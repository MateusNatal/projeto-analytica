# Analytica

> Dados que geram resultados.

O **Analytica** é um projeto acadêmico, de extensão (PEX) e de portfólio que ajuda pequenos empreendedores, sem conhecimento técnico, a entender as campanhas de marketing digital. A pessoa importa o relatório exportado da plataforma de anúncios e recebe indicadores explicados em linguagem simples, gráficos, observações automáticas e, opcionalmente, uma análise feita por inteligência artificial.

O Analytica é **100% gratuito** e foi desenvolvido para **fins educacionais**, aprendizado e experimentação com análise de dados.

- **Aplicação publicada:** https://projeto-analytica.vercel.app
- **Repositório:** https://github.com/MateusNatal/projeto-analytica

---

## Funcionalidades

| Área | O que faz |
|---|---|
| Importação de CSV | Lê relatórios do **Meta Ads**, **Google Ads**, **TikTok Ads** e o modelo próprio da Analytica, direto no navegador. |
| Indicadores | Investimento, receita, ROAS, conversões, CTR, impressões, cliques, CPC e CPA, cada um com explicação em linguagem simples. |
| Filtros | Plataforma, período (quando o arquivo tem datas), campanhas específicas e valor mínimo de uma métrica. Botão para limpar e mensagem quando não há resultados. |
| Gráficos | Investimento x receita, ROAS por campanha, conversões por campanha, ranking pela métrica escolhida e evolução diária no período. |
| Observações automáticas | Regras simples e explicáveis (retorno geral, campanhas que não se pagaram, conversões caras, CTR baixo, oportunidade de remanejar verba). |
| Análise com IA | Explicação e recomendações geradas pela Gemini API, do Google, pelo servidor (exige login). |
| Conta | Login e cadastro por link mágico no e-mail, sem senha. Histórico de arquivos salvos por usuário. |
| Avaliação | Botão flutuante **Feedback** com questionário anônimo e pergunta sobre ROAS antes e depois do uso. |
| Administração | Painel de avaliações com gráficos, comparação do ROAS antes/depois, sugestões e exportação em CSV, só para administradores. |
| Interface | Tema escuro por padrão e tema claro opcional, layout para desktop, tablet e celular. |

---

## Tecnologias

- **Frontend:** React 19, TypeScript e Vite.
- **Gráficos:** Recharts. **Leitura de CSV:** Papa Parse.
- **Backend e banco:** Supabase (PostgreSQL, Auth e Row Level Security).
- **Função de servidor:** Vercel Functions (`api/insights.ts`), com o SDK oficial `@google/genai`.
- **Hospedagem:** Vercel. **Versionamento e CI:** GitHub e GitHub Actions.
- **Fontes:** Outfit e Inter servidas pelo próprio site (`@fontsource-variable`), sem requisições ao Google Fonts.
- **Testes:** Vitest, com as migrações SQL executadas num Postgres embutido (PGlite).

---

## Plataformas de anúncios suportadas

A importação é feita por arquivo CSV exportado da plataforma. **Não há integração direta com as APIs** do Meta, do Google ou do TikTok.

| Plataforma | Colunas reconhecidas (inglês e português) |
|---|---|
| Meta Ads | Nome da campanha, Valor usado, Impressões, Cliques no link/Cliques, Compras/Resultados, Valor de conversão das compras, Início e Término dos relatórios |
| Google Ads | Campanha, Custo, Impr., Cliques, Conversões, Valor conv., Dia. Ignora as linhas de título e as linhas "Total: …" |
| TikTok Ads | Campaign name/Nome da campanha, Date/Data, Cost/Custo, Impressions, Clicks (destination)/Cliques (destino), Conversions, Total complete payment value/Purchase value |
| Modelo Analytica | Campanha, Plataforma, Investimento, Impressões, Cliques, Conversões, Receita |

Detalhes da importação:

- Números no formato brasileiro (`1.234,56`) e americano (`1,234.56`), com ou sem `R$`; `--` vale zero.
- Datas ISO (`2026-10-01`), brasileiras (`01/10/2026`) e por extenso (`1 de out. de 2026`, `Oct 1, 2026`).
- Codificação UTF-8, UTF-16 (comum no Google Ads) e Windows-1252 (Excel em português); separador vírgula, ponto e vírgula ou tabulação.
- No TikTok, "Clicks (destination)" tem prioridade sobre "Clicks (all)".
- **Obrigatórias:** campanha, investimento, impressões e cliques. **Opcionais:** conversões e receita.
- **Só métricas presentes no arquivo:** se não houver coluna de receita ou de conversões, as métricas que dependem dela (receita, ROAS, conversões, CPA, taxa de conversão) aparecem como "não disponível" e não como zero, e ficam fora dos filtros, gráficos, observações e da análise com IA.
- Linhas inválidas são ignoradas e listadas com o número da linha e o motivo.
- Exemplos para baixar ficam em `public/exemplos/` (dados fictícios).

---

## Indicadores

| Indicador | Cálculo | Cor |
|---|---|---|
| Investimento | soma do gasto | laranja |
| Receita | soma da receita | verde |
| Impressões | soma | roxo |
| Cliques | soma | azul |
| Conversões | soma | verde-azulado |
| CTR | cliques ÷ impressões | violeta (taxa) |
| CPC | investimento ÷ cliques | vermelho (custo) |
| CPA | investimento ÷ conversões | vermelho (custo) |
| Taxa de conversão | conversões ÷ cliques | violeta (taxa) |
| ROAS | receita ÷ investimento | violeta (taxa) |

As cores são as mesmas nos indicadores, gráficos, legendas e cabeçalhos da tabela. O par investimento (laranja) e receita (verde), que aparece no mesmo gráfico, foi validado para daltonismo em cada tema. Quando uma divisão é por zero, o indicador mostra "—".

## Filtros

- **Plataforma**, **período** (só aparece quando o arquivo tem datas; vale o intervalo completo de cada linha), **campanhas** (seleção múltipla com busca) e **valor mínimo de uma métrica** (aplicado ao total de cada campanha no período).
- Os filtros só escolhem as linhas originais do arquivo, sem alterar valores; a soma por campanha é feita uma única vez sobre o resultado.
- A métrica escolhida no filtro também define o ranking e o gráfico de evolução.

---

## Login, administração e armazenamento

- **Login e cadastro:** botões **Entrar** e **Criar conta** no topo. O Supabase envia um link mágico por e-mail; no primeiro acesso, a conta é criada. Conectado, o menu da conta mostra os arquivos salvos, a análise com IA, o painel de avaliações (só administradores) e a opção de sair.
- **Armazenamento:** os dados só são salvos quando a pessoa está conectada e escolhe "Salvar arquivo atual". Sem login, os arquivos são lidos apenas no navegador e somem ao fechar a página. As avaliações do botão Feedback são anônimas e podem ser enviadas sem login. O navegador guarda localmente só o tema escolhido e o estado da avaliação.
- **Permissões no banco:** todas as regras são aplicadas pelo PostgreSQL com Row Level Security, não pela interface:
  - cada usuário só lê, altera e apaga os próprios arquivos e campanhas;
  - visitantes sem login não acessam nenhuma tabela;
  - avaliações podem ser enviadas por qualquer pessoa, mas só administradores (`public.admin_users`, verificado por `public.is_admin()`) as leem ou apagam;
  - ninguém se torna administrador pelo site.
- **Permissões no servidor:** a função `api/insights.ts` valida o token do Supabase Auth antes de chamar a IA e registra o uso na tabela `ai_usage`, também protegida por RLS.

**Tornar alguém administrador:** a pessoa entra no site uma vez e, no **SQL Editor** do Supabase:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'email-da-pessoa@exemplo.com';
```

Para remover: `delete from public.admin_users where user_id = (select id from auth.users where email = '...');`

---

## Análise com IA

- Executada só no servidor (`api/insights.ts`), com a chave `GEMINI_API_KEY`, que nunca vai para o navegador.
- Exige login e tem limite de análises por usuário a cada 24 horas (`AI_DAILY_LIMIT`, padrão 20).
- O modelo recebe apenas nomes e números das campanhas exibidas; métricas que o arquivo não traz são retiradas dos dados enviados.
- A resposta é pedida em JSON estruturado e validada antes de chegar à tela.
- Modelo padrão: `gemini-3.5-flash-lite`, do plano gratuito da Gemini API. No plano gratuito, o Google pode usar os dados enviados para melhorar os produtos dele, e o app avisa o usuário antes de gerar a análise. Se a cota gratuita acabar, a análise fica indisponível até ela ser renovada.

---

## Instalação e execução local

Requisitos: Node.js 24.

```bash
npm ci          # instala as dependências exatas do package-lock.json
npm run dev     # servidor de desenvolvimento em http://localhost:5173
npm test        # testes automatizados (Vitest)
npm run lint    # ESLint
npm run build   # checagem de tipos e build de produção em dist/
npm run preview # serve o build de produção localmente
```

Sem variáveis de ambiente, o painel funciona normalmente com importação de CSV, filtros, gráficos e observações; login, histórico, avaliações e IA ficam desativados. O `npm run dev` não executa a função `api/`; para testar a IA localmente, use `npx vercel dev`.

### Variáveis de ambiente

Copie `.env.example` para `.env.local` (não versionado). Na Vercel, cadastre em **Settings → Environment Variables**.

| Variável | Onde | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend | URL do projeto Supabase. |
| `VITE_SUPABASE_ANON_KEY` | frontend | Chave pública (anon/publishable). É pública por design; os dados são protegidos pelo RLS. |
| `GEMINI_API_KEY` | servidor | Chave da Gemini API. **Sem** prefixo `VITE_`. |
| `GEMINI_MODEL` | servidor (opcional) | Padrão `gemini-3.5-flash-lite`. |
| `GEMINI_THINKING_LEVEL` | servidor (opcional) | `minimal`, `low` (padrão), `medium` ou `high`. |
| `AI_DAILY_LIMIT` | servidor (opcional) | Análises por usuário em 24 horas (padrão 20). |

Nunca coloque chaves secretas (Gemini, `service_role` do Supabase) no código ou em variáveis `VITE_*`, que são embutidas no JavaScript enviado ao navegador.

---

## Supabase e migrations

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Rode as migrations de `supabase/migrations/`, **em ordem**, no **SQL Editor** (colando o conteúdo completo de cada arquivo) ou com `supabase db push`:

| Migration | O que faz |
|---|---|
| `20261016000000_initial_schema.sql` | Tabelas `datasets` e `campaigns` com RLS e a função `save_dataset`. |
| `20261016010000_ai_usage.sql` | Tabela `ai_usage` para o limite diário da IA. |
| `20261016020000_revoke_unused_privileges.sql` | Remove `TRUNCATE`, `REFERENCES` e `TRIGGER` do papel `authenticated` (o `TRUNCATE` ignoraria o RLS). |
| `20261017000000_feedback.sql` | Avaliações anônimas, administradores (`admin_users`, `is_admin()`) e limite de envios por minuto. |
| `20261018000000_dates_and_tiktok.sql` | Datas por linha (`report_date`, `report_end_date`), métricas disponíveis por arquivo (`available_fields`), formato `tiktok` e a função `save_dataset_v2`. |

Nenhuma migration apaga dados. Arquivos salvos antes da última migration continuam abrindo, tratados como "sem datas" e com todas as métricas.

3. Em **Authentication → URL Configuration**, defina a *Site URL* com a URL de produção e adicione `http://localhost:5173` em *Redirect URLs*.
4. O serviço de e-mail padrão do Supabase envia poucos e-mails por hora; para uso real, configure um SMTP em **Authentication → SMTP Settings**.

---

## Testes, lint e build

```bash
npm test
npm run lint
npm run build
```

Os testes ficam em `tests/` e cobrem cálculos, importação (Meta, Google, TikTok, modelo próprio, codificações e datas), filtros e consolidação, validações, formatação, observações automáticas, o histórico, a função de IA (autenticação, limites, erros e métricas ausentes) e as **políticas de RLS**, executando as migrations reais num Postgres embutido. Os testes usam apenas dados fictícios.

O GitHub Actions (`.github/workflows/ci.yml`) roda lint, testes e build a cada push e pull request. Na Vercel, o build roda `npm test && npm run build`: se algum teste falhar, o deploy não acontece.

---

## Deploy (Vercel)

Configurado em `vercel.json`: instala com `npm ci`, constrói com `npm test && npm run build` e publica `dist/`. Rotas do frontend caem em `index.html`; `/api/*` fica com as funções de servidor. Cada push na `main` gera um deploy de produção e cada pull request recebe uma URL de preview.

Ao publicar uma versão que depende de uma migration nova, aplique a migration no Supabase **antes** do deploy.

---

## Estrutura

```text
api/                  função de servidor (análise com IA)
public/brand/         logomarca, favicons e imagem de compartilhamento
public/exemplos/      CSVs de exemplo (dados fictícios)
src/components/       componentes da interface (ui/ = componentes reutilizáveis)
src/services/         importação de CSV, Supabase, histórico e avaliações
src/utils/            cálculos, filtros, formatação e catálogo de métricas
src/styles/           tokens de design e estilos
supabase/migrations/  migrations do banco
tests/                testes automatizados
```
