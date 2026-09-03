-- =============================================================================
-- Multicotador RT: Tabela de Feedbacks
-- Execute este SQL no painel do Supabase: SQL Editor > New Query
-- =============================================================================

-- 1. Cria a tabela de feedbacks
create table if not exists public.feedbacks (
  id          uuid default gen_random_uuid() primary key,
  usuario_id  uuid references auth.users(id) on delete set null,
  email       text not null,
  tipo        text not null check (tipo in ('bug', 'melhoria', 'duvida', 'outro')),
  mensagem    text not null check (char_length(mensagem) between 1 and 2000),
  pagina      text,              -- URL ou rota de onde o feedback foi enviado
  criado_em   timestamptz default now() not null
);

-- 2. Indice para consultas ordenadas por data
create index if not exists idx_feedbacks_criado_em on public.feedbacks (criado_em desc);

-- 3. Habilita Row Level Security (RLS)
alter table public.feedbacks enable row level security;

-- 4. Politica INSERT: usuarios autenticados podem inserir feedback
--    vinculado ao proprio ID (ninguem pode inserir "como se fosse" outro usuario).
create policy "Usuarios autenticados inserem proprio feedback"
  on public.feedbacks
  for insert
  to authenticated
  with check (usuario_id = auth.uid());

-- 5. Politica SELECT: somente a service_role (admin) pode ler todos os feedbacks.
--    Nenhum usuario comum consegue listar feedbacks de outros — nem os proprios,
--    para nao expor a feature como canal de exfiltracao.
--    Para ler, use o painel do Supabase ou o cliente admin (service_role).
--    Se preferir que o usuario veja os proprios feedbacks, descomente a politica abaixo.

-- create policy "Usuario le os proprios feedbacks"
--   on public.feedbacks
--   for select
--   to authenticated
--   using (usuario_id = auth.uid());

-- 6. Comentarios descritivos
comment on table  public.feedbacks           is 'Feedbacks e sugestoes dos assessores sobre o Multicotador';
comment on column public.feedbacks.tipo      is 'Categoria: bug, melhoria, duvida ou outro';
comment on column public.feedbacks.mensagem  is 'Texto livre do assessor (maximo 2000 caracteres)';
comment on column public.feedbacks.pagina    is 'Rota/URL de onde o feedback foi enviado';
