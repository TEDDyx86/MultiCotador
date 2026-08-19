'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Encerra a sessao.
 *
 * A rota de logout fica atras do proxy, como as demais: sem cookie valido ela
 * responde 401 — o que ja significa que nao ha sessao para encerrar. Por isso um
 * 401 aqui e tratado como sucesso, e nao como erro.
 *
 * O router.refresh() depois do replace evita a tela voltar do cache do cliente
 * com a aparencia de quem continua logado.
 */
export function BotaoSair() {
  const [saindo, setSaindo] = useState(false)
  const router = useRouter()

  async function sair() {
    if (saindo) return
    setSaindo(true)
    try {
      await fetch('/api/logout', { method: 'POST' })
    } catch {
      // Falha de rede nao deve prender o corretor numa sessao que ele quer
      // encerrar: o cookie expira sozinho e a navegacao segue.
    }
    router.replace('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={sair}
      disabled={saindo}
      className="inline-flex items-center gap-1.5 rounded-md border border-cofre-borda px-2.5 py-1.5
                 text-xs font-semibold uppercase tracking-wider text-cofre-suave transition-colors
                 hover:border-cofre-acento/60 hover:text-cofre-acento disabled:opacity-50"
    >
      <svg
        aria-hidden
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
        />
      </svg>
      {saindo ? 'Saindo...' : 'Sair'}
    </button>
  )
}
