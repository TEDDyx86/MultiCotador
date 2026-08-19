'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Login() {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const router = useRouter()

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setErro('')

    const resposta = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    })

    if (resposta.ok) {
      router.replace('/')
      router.refresh()
    } else {
      const corpo = await resposta.json().catch(() => ({}))
      setErro(corpo.erro ?? 'Não foi possível autenticar.')
      setSenha('')
      setEnviando(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#050E1D] p-6">
      {/* Textura de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-screen"
        style={{
          backgroundImage: 'url(/marcas/textura-cabecalho.png)',
          backgroundSize: '320px',
        }}
      />

      <form
        onSubmit={enviar}
        className="relative z-10 w-full max-w-sm rounded-xl border border-cofre-borda bg-cofre-placa p-8 shadow-2xl"
      >
        <div className="mb-6 text-center">
          <Image
            src="/marcas/rt-horizontal-branca.png"
            alt="Robson Tavernard"
            width={1558}
            height={400}
            priority
            className="mx-auto h-7 w-auto mb-3"
          />
          <h1 className="text-sm font-bold uppercase tracking-[0.16em] text-cofre-acento">
            Acesso Restrito
          </h1>
          <p className="text-xs text-cofre-suave mt-0.5">
            Simulador Whole Life Multi-Seguradoras
          </p>
        </div>

        <label htmlFor="senha" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-cofre-suave">
          Senha de acesso
        </label>
        <input
          id="senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoFocus
          autoComplete="current-password"
          className="mb-4 w-full rounded-md border border-cofre-borda bg-[#061224] px-3.5 py-2.5
                     text-sm text-cofre-texto shadow-inner outline-none transition-all
                     focus:border-cofre-acento focus:ring-1 focus:ring-cofre-acento/40"
        />

        {erro && (
          <p role="alert" className="mb-4 rounded bg-cofre-perigo/10 border border-cofre-perigo/30 px-3 py-2 text-xs text-cofre-perigo">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando || senha.length === 0}
          className="w-full rounded-md bg-gradient-to-r from-cofre-acento to-cofre-acento-hover py-3
                     text-xs font-bold uppercase tracking-wider text-[#061224] shadow-md transition-all
                     hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? 'Verificando...' : 'Acessar Plataforma'}
        </button>
      </form>
    </main>
  )
}
