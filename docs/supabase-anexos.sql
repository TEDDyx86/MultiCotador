-- =============================================================================
-- Multicotador RT: anexos no feedback
-- Execute no painel do Supabase: SQL Editor > New Query
-- Depende de supabase-feedbacks.sql, que deve ter sido executado antes.
-- =============================================================================

-- 1. Onde os caminhos dos arquivos ficam guardados.
--    Um array de texto, e nao uma tabela separada: sao no maximo tres arquivos
--    por feedback, sempre lidos junto com ele e nunca consultados sozinhos.
alter table public.feedbacks
  add column if not exists anexos text[] not null default '{}';

comment on column public.feedbacks.anexos is
  'Caminhos dos arquivos no bucket feedback-anexos, no formato {usuario_id}/{feedback_id}/{arquivo}';

-- 2. O bucket. Privado: sem isto, qualquer pessoa com o link ve o arquivo,
--    e uma captura de tela do sistema pode conter dado de cliente.
insert into storage.buckets (id, name, public)
values ('feedback-anexos', 'feedback-anexos', false)
on conflict (id) do nothing;

-- 3. Regras de acesso aos arquivos, espelhando as da tabela.
--
--    O primeiro nivel do caminho e o id de quem enviou. Comparar esse nivel com
--    auth.uid() e o que impede alguem de gravar na pasta de outra pessoa —
--    equivale ao `usuario_id = auth.uid()` que ja protege a tabela.

drop policy if exists "Autor grava anexo na propria pasta" on storage.objects;
create policy "Autor grava anexo na propria pasta"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'feedback-anexos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Nenhuma politica de SELECT para `authenticated`, de proposito: quem envia nao
-- rele o proprio anexo, e ninguem le o dos outros. A leitura acontece pela
-- chave de servico, que gera links assinados e temporarios
-- (npm run feedback:listar).
