'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ROTULO_TIPO,
  TAMANHO_MAXIMO_MENSAGEM,
  TIPOS_FEEDBACK,
  type TipoFeedback,
} from '@/lib/feedback/validacao'
import {
  formatarTamanho,
  MAXIMO_ANEXOS,
  TIPOS_ACEITOS,
  validarLoteAnexos,
} from '@/lib/feedback/anexos'

/**
 * Registro de feedback dos avaliadores.
 *
 * Mora no cabecalho, e nao no painel: a tela de resultado foi calibrada para
 * caber em 900px sem rolagem, e qualquer bloco novo ali devolveria a rolagem.
 * Aqui em cima custa zero altura, e a caixa abre por cima.
 *
 * Usa o <dialog> nativo em vez de um overlay proprio porque ele ja traz
 * prendimento de foco, fechamento por Esc e semantica de modal — coisas que uma
 * div com position:fixed so tem se alguem lembrar de escrever, e ninguem lembra.
 */
export function BotaoFeedback() {
  const [aberto, setAberto] = useState(false)
  const [tipo, setTipo] = useState<TipoFeedback>('melhoria')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [anexos, setAnexos] = useState<File[]>([])
  const caixa = useRef<HTMLDialogElement>(null)
  const campoArquivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = caixa.current
    if (!el) return
    if (aberto && !el.open) el.showModal()
    if (!aberto && el.open) el.close()
  }, [aberto])

  function fechar() {
    setAberto(false)
    // Espera a caixa sair de cena antes de limpar, para o texto nao piscar.
    setTimeout(() => {
      setMensagem('')
      setErro('')
      setEnviado(false)
      setTipo('melhoria')
      setAnexos([])
      if (campoArquivo.current) campoArquivo.current.value = ''
    }, 150)
  }

  function escolherArquivos(evento: React.ChangeEvent<HTMLInputElement>) {
    const escolhidos = [...(evento.target.files ?? [])]
    // O campo e sempre esvaziado: sem isso, escolher o mesmo arquivo de novo
    // depois de remove-lo nao dispara evento, e ele parece nao ter sido aceito.
    evento.target.value = ''
    if (escolhidos.length === 0) return

    const juntos = [...anexos, ...escolhidos]
    const validacao = validarLoteAnexos(juntos.map((a) => a.size))
    if (!validacao.ok) {
      setErro(validacao.motivo)
      return
    }
    setErro('')
    setAnexos(juntos)
  }

  function removerAnexo(indice: number) {
    setAnexos(anexos.filter((_, i) => i !== indice))
    setErro('')
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    const texto = mensagem.trim()
    if (!texto || enviando) return

    setEnviando(true)
    setErro('')
    try {
      // FormData e nao JSON, para os arquivos irem no mesmo envio. O navegador
      // monta o Content-Type com o boundary; defini-lo na mao quebraria isso.
      const dados = new FormData()
      dados.set('tipo', tipo)
      dados.set('mensagem', texto)
      // De onde partiu: sem isso, "o botao nao funciona" chega sem dizer qual
      // botao, e o relato vira uma conversa de ida e volta.
      dados.set('pagina', window.location.pathname + window.location.search)
      for (const arquivo of anexos) dados.append('anexos', arquivo)

      const resposta = await fetch('/api/feedback', { method: 'POST', body: dados })

      if (resposta.status === 401) {
        setErro('Sua sessão expirou. Entre novamente para registrar.')
        return
      }
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}))
        setErro(corpo.erro ?? 'Não foi possível registrar. Tente novamente.')
        return
      }

      setEnviado(true)
      setTimeout(fechar, 1400)
    } catch {
      setErro('Falha de conexão. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const restantes = TAMANHO_MAXIMO_MENSAGEM - mensagem.trim().length

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="alvo-discreto inline-flex items-center gap-1.5 rounded-md border border-cofre-borda px-2.5 py-1.5
                   text-xs font-semibold uppercase tracking-wider text-cofre-suave transition-colors
                   hover:border-cofre-acento/60 hover:text-cofre-acento"
      >
        <svg aria-hidden className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
          />
        </svg>
        Feedback
      </button>

      <dialog
        ref={caixa}
        onClose={fechar}
        onClick={(e) => {
          // Clique no backdrop fecha. O <dialog> entrega o clique do fundo como
          // se fosse no proprio elemento, entao a comparacao com o alvo basta.
          if (e.target === caixa.current) fechar()
        }}
        aria-labelledby="feedback-titulo"
        className="w-full max-w-md rounded-xl border border-cofre-borda bg-cofre-placa p-0 text-cofre-texto
                   backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <form onSubmit={enviar} className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4 border-b border-cofre-borda/60 pb-3">
            <div>
              <h2 id="feedback-titulo" className="text-sm font-bold text-cofre-texto">
                Registrar feedback
              </h2>
              <p className="mt-0.5 text-xs text-cofre-suave">
                Vai direto para a avaliação da ferramenta.
              </p>
            </div>
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar"
              className="alvo-discreto -mr-1 -mt-1 rounded p-1 text-cofre-suave transition-colors hover:text-cofre-texto"
            >
              <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <fieldset className="mb-4" disabled={enviando || enviado}>
            <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-cofre-suave">
              Tipo
            </legend>
            <div className="grid grid-cols-4 gap-1.5">
              {TIPOS_FEEDBACK.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => setTipo(opcao)}
                  aria-pressed={tipo === opcao}
                  className={`realce-hover rounded border px-1 py-1.5 text-xs transition-all ${
                    tipo === opcao
                      ? 'border-cofre-suave/60 bg-cofre-placa-clara font-semibold text-cofre-texto'
                      : 'border-cofre-borda bg-[#061224] text-cofre-suave hover:text-cofre-texto'
                  }`}
                >
                  {ROTULO_TIPO[opcao]}
                </button>
              ))}
            </div>
          </fieldset>

          <label
            htmlFor="feedback-mensagem"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-cofre-suave"
          >
            Mensagem
          </label>
          <textarea
            id="feedback-mensagem"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            disabled={enviando || enviado}
            rows={5}
            maxLength={TAMANHO_MAXIMO_MENSAGEM}
            placeholder="O que aconteceu, ou o que faria a ferramenta servir melhor?"
            className="w-full resize-y rounded-md border border-cofre-borda bg-[#061224] px-3 py-2.5 text-sm
                       text-cofre-texto shadow-inner outline-none transition-all placeholder:text-cofre-suave/40
                       focus:border-cofre-acento focus:ring-1 focus:ring-cofre-acento/40 disabled:opacity-60"
          />
          <p className="mt-1 text-right text-xs text-cofre-suave/70">{restantes} restantes</p>

          <div className="mt-3">
            <input
              ref={campoArquivo}
              id="feedback-anexos"
              type="file"
              multiple
              accept={TIPOS_ACEITOS}
              onChange={escolherArquivos}
              disabled={enviando || enviado || anexos.length >= MAXIMO_ANEXOS}
              className="sr-only"
            />
            <label
              htmlFor="feedback-anexos"
              className={`inline-flex items-center gap-1.5 rounded-md border border-cofre-borda px-2.5 py-1.5
                          text-xs font-semibold uppercase tracking-wider transition-colors ${
                            enviando || enviado || anexos.length >= MAXIMO_ANEXOS
                              ? 'cursor-not-allowed text-cofre-suave/40'
                              : 'cursor-pointer text-cofre-suave hover:border-cofre-acento/60 hover:text-cofre-acento'
                          }`}
            >
              <svg aria-hidden className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                />
              </svg>
              Anexar
            </label>
            <span className="ml-2 text-xs text-cofre-suave/70">
              Imagem ou PDF, até {MAXIMO_ANEXOS} arquivos
            </span>

            {anexos.length > 0 && (
              <ul className="mt-2 space-y-1">
                {anexos.map((arquivo, indice) => (
                  <li
                    key={`${arquivo.name}-${indice}`}
                    className="flex items-center justify-between gap-2 rounded border border-cofre-borda bg-[#061224] px-2.5 py-1.5"
                  >
                    <span className="min-w-0 truncate text-xs text-cofre-texto">{arquivo.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-cofre-suave/70">
                        {formatarTamanho(arquivo.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removerAnexo(indice)}
                        disabled={enviando || enviado}
                        aria-label={`Remover ${arquivo.name}`}
                        className="alvo-discreto rounded p-0.5 text-cofre-suave transition-colors hover:text-cofre-perigo"
                      >
                        <svg aria-hidden className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {erro && (
            <p
              role="alert"
              className="mt-2 rounded border border-cofre-perigo/40 bg-cofre-perigo/10 px-3 py-2 text-xs text-cofre-perigo"
            >
              {erro}
            </p>
          )}

          {enviado ? (
            <p
              role="status"
              className="mt-4 rounded-md border border-cofre-sucesso/40 bg-cofre-sucesso/10 px-3 py-2.5 text-center text-xs font-semibold text-cofre-sucesso"
            >
              Registrado. Obrigado!
            </p>
          ) : (
            <button
              type="submit"
              disabled={enviando || mensagem.trim().length === 0}
              className="mt-4 w-full rounded-md bg-gradient-to-r from-cofre-acento to-cofre-acento-hover py-2.5
                         text-xs font-bold uppercase tracking-wider text-[#061224] shadow-md transition-all
                         hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {enviando ? 'Registrando...' : 'Registrar'}
            </button>
          )}
        </form>
      </dialog>
    </>
  )
}
