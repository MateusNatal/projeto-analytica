-- Analytica: remove permissões herdadas que o app não usa.
--
-- O Supabase concede, por padrão, todas as permissões das tabelas do schema
-- public aos papéis anon e authenticated. A migração inicial revogou tudo do
-- anon e concedeu ao authenticated só select, insert, update e delete, mas não
-- revogou o restante herdado. Ficaram sobrando:
--
-- - TRUNCATE: apaga todas as linhas da tabela IGNORANDO o RLS, inclusive as de
--   outros usuários. A API (PostgREST) não expõe TRUNCATE, mas qualquer caminho
--   futuro que execute SQL como authenticated tornaria isso explorável.
-- - REFERENCES: permite criar chaves estrangeiras apontando para as tabelas.
-- - TRIGGER: permite criar gatilhos nas tabelas.
--
-- Nenhuma delas é usada pelo app. Select, insert, update e delete continuam
-- concedidos e limitados pelas políticas de RLS.
--
-- Impacto: só remove permissões. Não altera tabelas, políticas nem dados.
-- O papel service_role (backend do Supabase) não é afetado.
-- A tabela ai_usage já está correta (só select e insert) e não precisa de
-- alteração.

revoke truncate, references, trigger
  on public.datasets, public.campaigns
  from authenticated;

-- O anon já não tem acesso (revogado na migração inicial). Repetir aqui
-- garante o mesmo resultado mesmo que alguém conceda algo manualmente.
revoke truncate, references, trigger
  on public.datasets, public.campaigns, public.ai_usage
  from anon;
