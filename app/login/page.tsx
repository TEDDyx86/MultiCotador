'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
      setErro(corpo.erro ?? 'Nao foi possivel entrar.')
      setSenha('')
      setEnviando(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A1A33] p-6">
      <form
        onSubmit={enviar}
        className="w-full max-w-sm rounded-lg bg-[#132844] p-8 shadow-xl"
      >
        <h1 className="mb-6 text-lg font-semibold text-[#E8EEF7]">Multicotador</h1>

        <label htmlFor="senha" className="mb-2 block text-sm text-[#8FA3BF]">
          Senha de acesso
        </label>
        <input
          id="senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoFocus
          autoComplete="current-password"
          className="mb-4 w-full rounded border border-[#1C3557] bg-[#0A1A33] px-3 py-2
                     text-[#E8EEF7] outline-none focus:border-[#22A7F0]"
        />

        {erro && (
          <p role="alert" className="mb-4 text-sm text-red-400">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando || senha.length === 0}
          className="w-full rounded bg-[#22A7F0] py-2 font-medium text-[#0A1A33]
                     disabled:opacity-40"
        >
          {enviando ? 'Verificando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
