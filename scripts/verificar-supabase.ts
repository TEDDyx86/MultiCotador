import { criarClienteAdmin } from '../lib/supabase/admin'
import { BUCKET_ANEXOS } from '../lib/feedback/anexos'
import { carregarEnvLocal } from './carregar-env'

/**
 * Diz o que ainda falta configurar no Supabase.
 *
 * Existe porque cada peca falha de um jeito diferente e nenhuma falha no build:
 * a variavel ausente derruba tudo com 503, a tabela ausente aparece so quando
 * alguem envia feedback, e o bucket ausente so quando alguem anexa arquivo. Um
 * comando que responde "o que falta" evita descobrir isso pelo caminho mais
 * caro, que e o avaliador tentando usar.
 *
 * Uso: npm run supabase:verificar
 */

carregarEnvLocal()

const VARIAVEIS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

let pendencias = 0

function relatar(ok: boolean, texto: string, comoResolver?: string) {
  console.log(`  ${ok ? 'ok    ' : 'FALTA '} ${texto}`)
  if (!ok && comoResolver) console.log(`           ${comoResolver}`)
  if (!ok) pendencias++
}

async function main() {
  console.log('\nConfiguração\n')
  for (const nome of VARIAVEIS) {
    relatar(Boolean(process.env[nome]), nome, 'preencha no .env.local')
  }
  if (pendencias > 0) {
    console.log('\nSem as chaves não dá para verificar o resto.\n')
    process.exitCode = 1
    return
  }

  const supabase = criarClienteAdmin()

  console.log('\nProjeto\n')
  const { data: usuarios, error: erroAuth } = await supabase.auth.admin.listUsers({ perPage: 200 })
  relatar(!erroAuth, `conexão${erroAuth ? ` — ${erroAuth.message}` : ''}`)
  if (erroAuth) {
    process.exitCode = 1
    return
  }
  const total = usuarios.users.length
  relatar(total > 0, `${total} conta(s) cadastrada(s)`, 'npm run usuario:criar -- <email>')

  console.log('\nFeedback\n')
  const { error: erroTabela, count } = await supabase
    .from('feedbacks')
    .select('id', { count: 'exact', head: true })
  relatar(
    !erroTabela,
    erroTabela ? `tabela "feedbacks" — ${erroTabela.message}` : `tabela "feedbacks" (${count ?? 0} registro(s))`,
    'rode docs/supabase-feedbacks.sql no SQL Editor',
  )

  // A coluna de anexos: pedir so ela devolve erro 42703 quando nao existe.
  if (!erroTabela) {
    const { error: erroColuna } = await supabase.from('feedbacks').select('anexos').limit(1)
    relatar(
      !erroColuna,
      erroColuna ? `coluna "anexos" — ${erroColuna.message}` : 'coluna "anexos"',
      'rode docs/supabase-anexos.sql no SQL Editor',
    )
  }

  const { data: buckets, error: erroBuckets } = await supabase.storage.listBuckets()
  const bucket = buckets?.find((b) => b.name === BUCKET_ANEXOS)
  relatar(
    Boolean(bucket) && !erroBuckets,
    `bucket "${BUCKET_ANEXOS}"`,
    'rode docs/supabase-anexos.sql no SQL Editor',
  )
  if (bucket) {
    // Bucket publico deixa qualquer pessoa com o link abrir o anexo, e uma
    // captura de tela do sistema pode conter dado de cliente.
    relatar(!bucket.public, 'bucket é privado', 'marque como privado no painel de Storage')
  }

  console.log(
    pendencias === 0
      ? '\nTudo pronto.\n'
      : `\n${pendencias} pendência(s) acima.\n`,
  )
  process.exitCode = pendencias === 0 ? 0 : 1
}

main().catch((e) => {
  console.log('\n  FALHA ', e instanceof Error ? e.message : e, '\n')
  process.exitCode = 1
})
