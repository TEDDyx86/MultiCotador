import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { criarClienteServidor, obterUsuarioAtual } from '@/lib/supabase/servidor'
import {
  ehTipoFeedback,
  sanitizarMensagem,
  sanitizarPagina,
  TAMANHO_MAXIMO_MENSAGEM,
} from '@/lib/feedback/validacao'
import {
  BUCKET_ANEXOS,
  reconhecerTipo,
  sanitizarNomeArquivo,
  validarLoteAnexos,
} from '@/lib/feedback/anexos'

export const runtime = 'nodejs'

const SEM_CACHE = { 'Cache-Control': 'no-store' }

type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>

/**
 * Desfaz os envios ja feitos quando algo falha no meio.
 *
 * Melhor esforco: se a limpeza tambem falhar, o feedback nao pode deixar de ser
 * respondido por causa de um arquivo orfao num bucket privado.
 */
async function removerAnexos(supabase: ClienteSupabase, caminhos: string[]): Promise<void> {
  if (caminhos.length === 0) return
  try {
    await supabase.storage.from(BUCKET_ANEXOS).remove(caminhos)
  } catch (erro) {
    console.error('[feedback] anexos orfaos:', caminhos.join(', '), erro)
  }
}

export async function POST(requisicao: Request) {
  /*
   * O proxy ja barra /api/* sem sessao, mas a rota confere por conta propria:
   * nada garante que a chamada veio de la, e um insert sem dono identificado
   * seria recusado pelo RLS de qualquer forma — melhor recusar aqui, com uma
   * mensagem que diz o que houve.
   */
  const usuario = await obterUsuarioAtual()
  if (!usuario) {
    return NextResponse.json({ erro: 'Sessão expirada.' }, { status: 401, headers: SEM_CACHE })
  }

  let formulario: FormData
  try {
    formulario = await requisicao.formData()
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400, headers: SEM_CACHE })
  }

  const tipo = formulario.get('tipo')
  if (!ehTipoFeedback(tipo)) {
    return NextResponse.json(
      { erro: 'Escolha o tipo do feedback.' },
      { status: 400, headers: SEM_CACHE },
    )
  }

  const mensagem = sanitizarMensagem(formulario.get('mensagem'))
  if (!mensagem) {
    return NextResponse.json(
      { erro: `Escreva a mensagem, em até ${TAMANHO_MAXIMO_MENSAGEM} caracteres.` },
      { status: 400, headers: SEM_CACHE },
    )
  }

  const arquivos = formulario.getAll('anexos').filter((a): a is File => a instanceof File)
  const loteValido = validarLoteAnexos(arquivos.map((a) => a.size))
  if (!loteValido.ok) {
    return NextResponse.json({ erro: loteValido.motivo }, { status: 400, headers: SEM_CACHE })
  }

  try {
    /*
     * Insercao pelo cliente do proprio usuario, e nao pelo admin: assim o RLS
     * continua valendo e a regra `usuario_id = auth.uid()` e verificada pelo
     * banco. Com a service_role o insert passaria mesmo com o dono errado, e a
     * unica garantia de autoria seria este arquivo.
     */
    const supabase = await criarClienteServidor()

    /*
     * O id sai daqui, antes da insercao, porque ele nomeia a pasta dos anexos.
     * A alternativa seria inserir, ler o id de volta e atualizar a linha com os
     * caminhos — e para isso a tabela precisaria aceitar UPDATE do autor, o que
     * abriria espaco para reescrever a mensagem depois de enviada.
     */
    const id = randomUUID()
    const caminhos: string[] = []

    for (const arquivo of arquivos) {
      const bytes = new Uint8Array(await arquivo.arrayBuffer())
      const reconhecido = reconhecerTipo(bytes)
      if (!reconhecido) {
        await removerAnexos(supabase, caminhos)
        return NextResponse.json(
          { erro: `"${arquivo.name}" não é uma imagem ou PDF.` },
          { status: 400, headers: SEM_CACHE },
        )
      }

      const nome = sanitizarNomeArquivo(arquivo.name, reconhecido.extensao)
      const caminho = `${usuario.id}/${id}/${caminhos.length + 1}-${nome}`

      const { error: erroUpload } = await supabase.storage
        .from(BUCKET_ANEXOS)
        .upload(caminho, bytes, { contentType: reconhecido.mime, upsert: false })

      if (erroUpload) {
        console.error('[feedback] falha ao subir anexo:', erroUpload.message)
        // Sem isto, uma falha no segundo arquivo deixaria o primeiro orfao no
        // bucket, sem nenhuma linha que o mencione.
        await removerAnexos(supabase, caminhos)
        return NextResponse.json(
          { erro: 'Não foi possível enviar o anexo. Tente novamente.' },
          { status: 502, headers: SEM_CACHE },
        )
      }
      caminhos.push(caminho)
    }

    const { error } = await supabase.from('feedbacks').insert({
      id,
      usuario_id: usuario.id,
      email: usuario.email,
      tipo,
      mensagem,
      pagina: sanitizarPagina(formulario.get('pagina')),
      anexos: caminhos,
    })

    if (error) await removerAnexos(supabase, caminhos)

    if (error) {
      // A causa vai para o log; ao avaliador vai uma frase que ele possa agir.
      console.error('[feedback] falha ao gravar:', error.message, error.code)
      return NextResponse.json(
        { erro: 'Não foi possível registrar agora. Tente novamente em instantes.' },
        { status: 502, headers: SEM_CACHE },
      )
    }

    return NextResponse.json({ ok: true }, { status: 201, headers: SEM_CACHE })
  } catch (erro) {
    console.error('[feedback] erro inesperado:', erro instanceof Error ? erro.message : erro)
    return NextResponse.json(
      { erro: 'Serviço indisponível no momento.' },
      { status: 503, headers: SEM_CACHE },
    )
  }
}
