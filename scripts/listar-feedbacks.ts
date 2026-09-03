import { criarClienteAdmin } from '../lib/supabase/admin'
import { ehTipoFeedback, ROTULO_TIPO } from '../lib/feedback/validacao'
import { BUCKET_ANEXOS } from '../lib/feedback/anexos'
import { carregarEnvLocal } from './carregar-env'

/**
 * Le os feedbacks registrados pelos avaliadores.
 *
 * Existe porque a politica de RLS da tabela so deixa a service_role fazer
 * SELECT — de proposito, para o canal nao virar uma forma de um avaliador ler o
 * que os outros escreveram. A consequencia e que nem pelo aplicativo o dono
 * consegue ler: ou abre o painel do Supabase, ou usa este script.
 *
 * Uso:
 *   npm run feedback:listar
 *   npm run feedback:listar -- --tipo bug
 *   npm run feedback:listar -- --limite 100
 */

carregarEnvLocal()

interface Feedback {
  id: string
  email: string
  tipo: string
  mensagem: string
  pagina: string | null
  anexos: string[] | null
  criado_em: string
}

/** Uma hora e o bastante para abrir agora e curto o bastante para nao circular. */
const VALIDADE_LINK_SEGUNDOS = 60 * 60

function argumento(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`)
  return i === -1 ? undefined : process.argv[i + 1]
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function executar() {
  const tipoFiltro = argumento('tipo')
  if (tipoFiltro !== undefined && !ehTipoFeedback(tipoFiltro)) {
    console.error(`\nTipo "${tipoFiltro}" não existe. Use: bug, melhoria, duvida ou outro.\n`)
    process.exit(1)
  }

  const limiteBruto = Number(argumento('limite') ?? 50)
  const limite = Number.isInteger(limiteBruto) && limiteBruto > 0 ? limiteBruto : 50

  let supabase: ReturnType<typeof criarClienteAdmin>
  try {
    supabase = criarClienteAdmin()
  } catch (erro) {
    console.error(`\n${erro instanceof Error ? erro.message : erro}\n`)
    process.exit(1)
  }

  let consulta = supabase
    .from('feedbacks')
    .select('id,email,tipo,mensagem,pagina,anexos,criado_em')
    .order('criado_em', { ascending: false })
    .limit(limite)

  if (tipoFiltro) consulta = consulta.eq('tipo', tipoFiltro)

  const { data, error } = await consulta

  if (error) {
    console.error(`\nFalha ao ler os feedbacks: ${error.message}`)
    if (error.code === '42P01') {
      console.error('A tabela não existe. Rode docs/supabase-feedbacks.sql no SQL Editor.')
    }
    console.error('')
    // exitCode em vez de exit(): a conexao do Supabase ainda esta aberta, e
    // derrubar o processo por cima dela aborta o libuv no Windows.
    process.exitCode = 1
    return
  }

  const feedbacks = (data ?? []) as Feedback[]

  if (feedbacks.length === 0) {
    console.log(
      tipoFiltro
        ? `\nNenhum feedback do tipo "${tipoFiltro}" ainda.\n`
        : '\nNenhum feedback registrado ainda.\n',
    )
    return
  }

  // Contagem por tipo antes da lista: com trinta registros, o que interessa
  // primeiro e se sao trinta erros ou trinta sugestoes.
  const porTipo = new Map<string, number>()
  for (const f of feedbacks) porTipo.set(f.tipo, (porTipo.get(f.tipo) ?? 0) + 1)

  const resumo = [...porTipo.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${ehTipoFeedback(t) ? ROTULO_TIPO[t] : t}: ${n}`)
    .join('   ')

  console.log(`\n${feedbacks.length} feedback(s)   —   ${resumo}\n`)
  console.log('─'.repeat(78))

  for (const f of feedbacks) {
    const rotulo = ehTipoFeedback(f.tipo) ? ROTULO_TIPO[f.tipo] : f.tipo
    console.log(`\n[${rotulo}]  ${f.email}  ·  ${formatarData(f.criado_em)}`)
    if (f.pagina) console.log(`de: ${f.pagina}`)
    console.log('')
    for (const linha of f.mensagem.split('\n')) console.log(`  ${linha}`)

    const anexos = f.anexos ?? []
    if (anexos.length > 0) {
      console.log(`\n  ${anexos.length} anexo(s):`)
      for (const caminho of anexos) {
        // O bucket e privado: sem link assinado, o anexo fica gravado e
        // ilegivel. A assinatura vence em uma hora.
        const { data, error } = await supabase.storage
          .from(BUCKET_ANEXOS)
          .createSignedUrl(caminho, VALIDADE_LINK_SEGUNDOS)
        const nome = caminho.split('/').pop()
        console.log(
          error || !data
            ? `    ${nome}  (falha ao gerar link: ${error?.message ?? 'desconhecida'})`
            : `    ${nome}\n      ${data.signedUrl}`,
        )
      }
    }

    console.log(`\n${'─'.repeat(78)}`)
  }
  console.log('')
}

executar()
