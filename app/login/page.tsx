'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const router = useRouter()

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setErro('')

    try {
      const resposta = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), senha }),
      })

      if (resposta.ok) {
        router.replace('/')
        router.refresh()
      } else {
        const corpo = await resposta.json().catch(() => ({}))
        setErro(corpo.erro ?? 'E-mail ou senha incorretos.')
        setSenha('')
        setEnviando(false)
      }
    } catch {
      setErro('Erro de comunicação com o servidor. Tente novamente.')
      setEnviando(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#050E1D] p-6">
      {/* Textura de fundo do monograma RT */}
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
        noValidate
        className="relative z-10 w-full max-w-sm rounded-xl border border-cofre-borda bg-cofre-placa p-8 shadow-2xl"
      >
        <div className="mb-6 text-center">
          <Image
            src="/marcas/rt-horizontal-branca.png"
            alt="Robson Tavernard"
            width={1558}
            height={400}
            priority
            className="mx-auto mb-3 h-7 w-auto"
          />
          <h1 className="text-sm font-bold uppercase tracking-[0.16em] text-cofre-acento">
            Acesso Restrito
          </h1>
          <p className="mt-0.5 text-xs text-cofre-suave">
            Simulador Whole Life Multi-Seguradoras
          </p>
        </div>

        {/* Campo E-mail */}
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-cofre-suave"
        >
          E-mail Corporativo
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="consultor@blue3.com.br"
          autoFocus
          required
          autoComplete="username"
          className="mb-4 w-full rounded-md border border-cofre-borda bg-[#061224] px-3.5 py-2.5
                     text-sm text-cofre-texto shadow-inner outline-none transition-all placeholder:text-cofre-suave/40
                     focus:border-cofre-acento focus:ring-1 focus:ring-cofre-acento/40"
        />

        {/* Campo Senha */}
        <label
          htmlFor="senha"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-cofre-suave"
        >
          Senha
        </label>
        <div className="relative mb-4">
          <input
            id="senha"
            type={mostrarSenha ? 'text' : 'password'}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-md border border-cofre-borda bg-[#061224] px-3.5 py-2.5 pr-10
                       text-sm text-cofre-texto shadow-inner outline-none transition-all placeholder:text-cofre-suave/40
                       focus:border-cofre-acento focus:ring-1 focus:ring-cofre-acento/40"
          />
          <button
            type="button"
            onClick={() => setMostrarSenha(!mostrarSenha)}
            aria-label={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cofre-suave hover:text-cofre-texto p-1"
          >
            {mostrarSenha ? (
              <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        {erro && (
          <p
            role="alert"
            className="mb-4 rounded border border-cofre-perigo/30 bg-cofre-perigo/10 px-3 py-2 text-xs text-cofre-perigo"
          >
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando || email.length === 0 || senha.length === 0}
          className="w-full rounded-md bg-gradient-to-r from-cofre-acento to-cofre-acento-hover py-3
                     text-xs font-bold uppercase tracking-wider text-[#061224] shadow-md transition-all
                     hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? 'Autenticando...' : 'Acessar Plataforma'}
        </button>

        <p className="mt-4 text-center text-[10px] uppercase tracking-wider text-cofre-suave/60">
          Acesso auditado • Robson Tavernard / Blue3
        </p>
      </form>
    </main>
  )
}
