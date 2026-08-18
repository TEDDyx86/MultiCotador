# Autenticação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proteger a aplicação com uma senha compartilhada, sem que o segredo apareça no navegador ou no repositório.

**Architecture:** Dois runtimes com responsabilidades separadas. O middleware (Edge) só verifica a assinatura do cookie usando Web Crypto. A rota de login (Node) verifica a senha com scrypt. O segredo nunca sai do servidor e nunca entra no bundle do cliente.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Vitest, `node:crypto` (scrypt, na rota de login), Web Crypto API (HMAC, no middleware).

---

## Por que a arquitetura é essa

O instinto seria verificar a senha no middleware. **Não funciona:** o middleware do Next.js roda no Edge Runtime, que não tem `node:crypto` — `scrypt`, `randomBytes` e `timingSafeEqual` não existem lá. Só há Web Crypto (`crypto.subtle`).

Daí a divisão:

| Camada | Runtime | O que faz | Ferramenta |
|---|---|---|---|
| `POST /api/login` | Node | Verifica a senha contra o hash | `scrypt` |
| `middleware.ts` | Edge | Verifica a assinatura do cookie | `crypto.subtle` HMAC |

A senha é verificada **uma vez**, no login. Depois disso, toda requisição só valida um cookie assinado — operação barata e possível no Edge.

## Modelo de ameaça

O que estamos protegendo: uma ferramenta interna numa URL pública da Vercel. O risco real é alguém encontrar a URL e usar a ferramenta, ou extrair as tabelas de tarifa.

Contra o que o desenho protege:
- **Segredo no bundle** — a causa nº 1 de vazamento em Next.js. Uma variável com prefixo `NEXT_PUBLIC_` é embutida no JavaScript servido ao navegador. Nenhuma variável aqui leva esse prefixo, e um teste verifica isso.
- **Segredo no repositório** — o `.gitignore` bloqueia os `.env`; só o `.env.example` (vazio) é versionado.
- **Senha legível por quem tem acesso ao painel da Vercel** — guardamos o hash scrypt, não a senha.
- **Ataque de temporização** — comparação de tempo constante, nunca `===`.
- **Roubo do cookie por JavaScript** — `httpOnly` impede leitura pelo script da página.
- **Força bruta** — limite de tentativas por IP.

O que este desenho **não** resolve, e é aceito conscientemente: não há usuários individuais nem trilha de auditoria por pessoa. Todos compartilham a mesma senha. Adequado a uma equipe pequena; não escala para "outros corretores" sem trocar por autenticação real.

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/auth/senha.ts` | Derivar e verificar hash scrypt (Node) |
| `lib/auth/sessao.ts` | Assinar e verificar o cookie (Web Crypto, roda nos dois runtimes) |
| `lib/auth/limite.ts` | Limite de tentativas por IP |
| `scripts/gerar-hash.ts` | CLI para gerar o hash da senha |
| `middleware.ts` | Bloqueia rotas sem cookie válido |
| `app/api/login/route.ts` | Recebe a senha, emite o cookie |
| `app/api/logout/route.ts` | Limpa o cookie |
| `app/login/page.tsx` | Formulário de senha |
| `tests/auth.test.ts` | Hash, cookie, expiração, adulteração, limite |
| `tests/segredos.test.ts` | Garante que os segredos não vazam no bundle |

---

### Task 1: Hash de senha

**Files:**
- Create: `lib/auth/senha.ts`, `scripts/gerar-hash.ts`
- Test: `tests/auth.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `tests/auth.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { gerarHash, verificarSenha } from '@/lib/auth/senha'

describe('hash de senha', () => {
  it('aceita a senha correta', async () => {
    const hash = await gerarHash('senha-de-teste')
    expect(await verificarSenha('senha-de-teste', hash)).toBe(true)
  })

  it('rejeita a senha errada', async () => {
    const hash = await gerarHash('senha-de-teste')
    expect(await verificarSenha('senha-errada', hash)).toBe(false)
  })

  it('gera hashes diferentes para a mesma senha', async () => {
    // Sal aleatorio: dois hashes iguais denunciariam senhas iguais.
    const a = await gerarHash('mesma-senha')
    const b = await gerarHash('mesma-senha')
    expect(a).not.toBe(b)
  })

  it('nao contem a senha em claro', async () => {
    const hash = await gerarHash('abracadabra')
    expect(hash).not.toContain('abracadabra')
  })

  it('rejeita hash malformado sem lancar excecao', async () => {
    expect(await verificarSenha('qualquer', 'lixo')).toBe(false)
    expect(await verificarSenha('qualquer', '')).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- tests/auth.test.ts`
Expected: FAIL, não resolve `@/lib/auth/senha`.

- [ ] **Step 3: Implementar**

Criar `lib/auth/senha.ts`:

```typescript
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

const TAMANHO_SAL = 16
const TAMANHO_CHAVE = 64

/**
 * Deriva o hash de uma senha. Formato: "<sal em hex>:<chave em hex>".
 * scrypt e deliberadamente lento e usa memoria, o que encarece ataque por
 * forca bruta em hardware dedicado.
 * Só roda em Node — o Edge Runtime nao tem node:crypto.
 */
export async function gerarHash(senha: string): Promise<string> {
  const sal = randomBytes(TAMANHO_SAL)
  const chave = (await scryptAsync(senha, sal, TAMANHO_CHAVE)) as Buffer
  return `${sal.toString('hex')}:${chave.toString('hex')}`
}

export async function verificarSenha(senha: string, hashArmazenado: string): Promise<boolean> {
  const [salHex, chaveHex] = hashArmazenado.split(':')
  if (!salHex || !chaveHex) return false

  let sal: Buffer
  let chaveEsperada: Buffer
  try {
    sal = Buffer.from(salHex, 'hex')
    chaveEsperada = Buffer.from(chaveHex, 'hex')
  } catch {
    return false
  }
  if (sal.length !== TAMANHO_SAL || chaveEsperada.length !== TAMANHO_CHAVE) return false

  const chave = (await scryptAsync(senha, sal, TAMANHO_CHAVE)) as Buffer
  // Comparacao de tempo constante: com "===" o tempo de resposta revela
  // quantos bytes iniciais estao corretos.
  return timingSafeEqual(chave, chaveEsperada)
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test -- tests/auth.test.ts`
Expected: PASS, 5 testes.

- [ ] **Step 5: Criar o gerador de hash**

Criar `scripts/gerar-hash.ts`:

```typescript
import { gerarHash } from '../lib/auth/senha'

const senha = process.argv[2]

if (!senha) {
  console.error('Uso: npx tsx scripts/gerar-hash.ts <senha>')
  process.exit(1)
}

if (senha.length < 12) {
  console.error('Escolha uma senha com pelo menos 12 caracteres.')
  process.exit(1)
}

gerarHash(senha).then((hash) => {
  console.log('\nAdicione ao .env.local (e as variaveis da Vercel):\n')
  console.log(`APP_SENHA_HASH=${hash}\n`)
})
```

- [ ] **Step 6: Verificar que o gerador funciona**

Run: `npx tsx scripts/gerar-hash.ts senha-de-teste-123`
Expected: imprime uma linha `APP_SENHA_HASH=<hex>:<hex>`.

Run: `npx tsx scripts/gerar-hash.ts curta`
Expected: recusa com a mensagem sobre 12 caracteres, código de saída 1.

- [ ] **Step 7: Commit**

```bash
git add lib/auth/senha.ts scripts/gerar-hash.ts tests/auth.test.ts
git commit -m "feat(auth): hash de senha com scrypt e comparacao de tempo constante"
```

---

### Task 2: Cookie de sessão assinado

**Files:**
- Create: `lib/auth/sessao.ts`
- Modify: `tests/auth.test.ts`

O cookie precisa ser verificável no Edge, então usa Web Crypto — disponível tanto no Node 18+ quanto no Edge Runtime.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao final de `tests/auth.test.ts`:

```typescript
import { assinarSessao, verificarSessao } from '@/lib/auth/sessao'

const SEGREDO = 'a'.repeat(64)

describe('cookie de sessao', () => {
  it('aceita um cookie que ele mesmo assinou', async () => {
    const token = await assinarSessao(SEGREDO, 3600)
    expect(await verificarSessao(SEGREDO, token)).toBe(true)
  })

  it('rejeita cookie assinado com outro segredo', async () => {
    const token = await assinarSessao(SEGREDO, 3600)
    expect(await verificarSessao('b'.repeat(64), token)).toBe(false)
  })

  it('rejeita cookie adulterado', async () => {
    const token = await assinarSessao(SEGREDO, 3600)
    const [payload, assinatura] = token.split('.')
    const adulterado = `${payload}x.${assinatura}`
    expect(await verificarSessao(SEGREDO, adulterado)).toBe(false)
  })

  it('rejeita cookie expirado', async () => {
    const token = await assinarSessao(SEGREDO, -1)
    expect(await verificarSessao(SEGREDO, token)).toBe(false)
  })

  it('rejeita lixo sem lancar excecao', async () => {
    expect(await verificarSessao(SEGREDO, 'lixo')).toBe(false)
    expect(await verificarSessao(SEGREDO, '')).toBe(false)
    expect(await verificarSessao(SEGREDO, 'a.b.c')).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- tests/auth.test.ts`
Expected: FAIL, não resolve `@/lib/auth/sessao`.

- [ ] **Step 3: Implementar**

Criar `lib/auth/sessao.ts`:

```typescript
/**
 * Sessao em cookie assinado por HMAC-SHA256.
 *
 * Usa Web Crypto (crypto.subtle) em vez de node:crypto porque precisa rodar
 * no middleware, que executa no Edge Runtime. Web Crypto existe nos dois.
 *
 * O cookie nao guarda segredo nenhum — so a data de expiracao e a assinatura.
 * Nao ha o que extrair dele; adulterar invalida a assinatura.
 */

const codificador = new TextEncoder()

function paraBase64Url(bytes: Uint8Array): string {
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function deBase64Url(texto: string): Uint8Array {
  const base64 = texto.replace(/-/g, '+').replace(/_/g, '/')
  const binario = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binario, (c) => c.charCodeAt(0))
}

async function importarChave(segredo: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    codificador.encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

/** Compara em tempo constante. Sair no primeiro byte diferente vaza informacao. */
function iguaisEmTempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferenca = 0
  for (let i = 0; i < a.length; i++) {
    diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diferenca === 0
}

async function assinar(segredo: string, payload: string): Promise<string> {
  const chave = await importarChave(segredo)
  const assinatura = await crypto.subtle.sign('HMAC', chave, codificador.encode(payload))
  return paraBase64Url(new Uint8Array(assinatura))
}

/** Emite um token valido por `duracaoSegundos`. */
export async function assinarSessao(segredo: string, duracaoSegundos: number): Promise<string> {
  const expiraEm = Math.floor(Date.now() / 1000) + duracaoSegundos
  const payload = paraBase64Url(codificador.encode(JSON.stringify({ exp: expiraEm })))
  return `${payload}.${await assinar(segredo, payload)}`
}

export async function verificarSessao(segredo: string, token: string): Promise<boolean> {
  if (!token) return false
  const partes = token.split('.')
  if (partes.length !== 2) return false

  const [payload, assinaturaRecebida] = partes

  let esperada: string
  try {
    esperada = await assinar(segredo, payload)
  } catch {
    return false
  }
  if (!iguaisEmTempoConstante(assinaturaRecebida, esperada)) return false

  // So le o conteudo depois de confirmar a assinatura: nunca confie em dado
  // que ainda nao foi autenticado.
  try {
    const dados = JSON.parse(new TextDecoder().decode(deBase64Url(payload)))
    return typeof dados.exp === 'number' && dados.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test -- tests/auth.test.ts`
Expected: PASS, 10 testes (5 de senha + 5 de sessão).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/sessao.ts tests/auth.test.ts
git commit -m "feat(auth): cookie de sessao assinado com HMAC via Web Crypto"
```

---

### Task 3: Limite de tentativas

**Files:**
- Create: `lib/auth/limite.ts`
- Modify: `tests/auth.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao final de `tests/auth.test.ts`:

```typescript
import { registrarTentativa, bloqueado, limparTentativas } from '@/lib/auth/limite'

describe('limite de tentativas', () => {
  it('libera enquanto esta abaixo do limite', () => {
    limparTentativas()
    for (let i = 0; i < 4; i++) registrarTentativa('10.0.0.1')
    expect(bloqueado('10.0.0.1')).toBe(false)
  })

  it('bloqueia ao atingir o limite', () => {
    limparTentativas()
    for (let i = 0; i < 5; i++) registrarTentativa('10.0.0.2')
    expect(bloqueado('10.0.0.2')).toBe(true)
  })

  it('isola um IP do outro', () => {
    limparTentativas()
    for (let i = 0; i < 5; i++) registrarTentativa('10.0.0.3')
    expect(bloqueado('10.0.0.4')).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- tests/auth.test.ts`
Expected: FAIL, não resolve `@/lib/auth/limite`.

- [ ] **Step 3: Implementar**

Criar `lib/auth/limite.ts`:

```typescript
/**
 * Limite de tentativas de login por IP.
 *
 * Estado em memoria, com uma limitacao conhecida: em serverless cada instancia
 * tem o proprio mapa, e ele se perde a cada cold start. Isso torna o limite
 * frouxo — nao serve contra um atacante distribuido e determinado.
 *
 * E aceitavel aqui porque a barreira principal e a senha com hash scrypt; este
 * limite so encarece tentativa casual. Se um dia precisar valer de verdade,
 * troque por armazenamento compartilhado (Vercel KV, Upstash).
 */

const LIMITE = 5
const JANELA_MS = 15 * 60 * 1000

const tentativas = new Map<string, number[]>()

function recentes(ip: string): number[] {
  const agora = Date.now()
  const lista = (tentativas.get(ip) ?? []).filter((t) => agora - t < JANELA_MS)
  if (lista.length > 0) tentativas.set(ip, lista)
  else tentativas.delete(ip)
  return lista
}

export function registrarTentativa(ip: string): void {
  const lista = recentes(ip)
  lista.push(Date.now())
  tentativas.set(ip, lista)
}

export function bloqueado(ip: string): boolean {
  return recentes(ip).length >= LIMITE
}

/** Limpa o estado. Existe para os testes; nao usar em producao. */
export function limparTentativas(): void {
  tentativas.clear()
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test -- tests/auth.test.ts`
Expected: PASS, 13 testes.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/limite.ts tests/auth.test.ts
git commit -m "feat(auth): limite de tentativas de login por IP"
```

---

### Task 4: Rotas de login e logout

**Files:**
- Create: `app/api/login/route.ts`, `app/api/logout/route.ts`, `lib/auth/config.ts`

- [ ] **Step 1: Criar a configuração compartilhada**

Criar `lib/auth/config.ts`:

```typescript
export const COOKIE_SESSAO = 'mc_sessao'

/** Oito horas: cobre um dia de trabalho sem exigir novo login. */
export const DURACAO_SESSAO_SEGUNDOS = 8 * 60 * 60

/**
 * Le uma variavel obrigatoria. Falha alto e cedo — uma aplicacao que sobe sem
 * segredo configurado ficaria aberta sem ninguem perceber.
 * Nenhuma destas variaveis tem prefixo NEXT_PUBLIC_, entao nunca chegam ao
 * navegador.
 */
export function segredoObrigatorio(nome: 'APP_SENHA_HASH' | 'APP_SESSAO_SEGREDO'): string {
  const valor = process.env[nome]
  if (!valor) {
    throw new Error(
      `Variavel de ambiente ${nome} nao configurada. ` +
        `Copie .env.example para .env.local e preencha.`,
    )
  }
  return valor
}
```

- [ ] **Step 2: Criar a rota de login**

Criar `app/api/login/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { verificarSenha } from '@/lib/auth/senha'
import { assinarSessao } from '@/lib/auth/sessao'
import { bloqueado, registrarTentativa } from '@/lib/auth/limite'
import { COOKIE_SESSAO, DURACAO_SESSAO_SEGUNDOS, segredoObrigatorio } from '@/lib/auth/config'

// scrypt vem de node:crypto, que nao existe no Edge Runtime.
export const runtime = 'nodejs'

export async function POST(requisicao: Request) {
  const ip =
    requisicao.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'desconhecido'

  if (bloqueado(ip)) {
    return NextResponse.json(
      { erro: 'Muitas tentativas. Tente novamente em alguns minutos.' },
      { status: 429 },
    )
  }

  let senha: unknown
  try {
    senha = (await requisicao.json())?.senha
  } catch {
    senha = undefined
  }

  if (typeof senha !== 'string' || senha.length === 0) {
    registrarTentativa(ip)
    return NextResponse.json({ erro: 'Senha invalida.' }, { status: 400 })
  }

  const confere = await verificarSenha(senha, segredoObrigatorio('APP_SENHA_HASH'))
  if (!confere) {
    registrarTentativa(ip)
    // Mensagem generica: nao confirma nem nega nada sobre a senha correta.
    return NextResponse.json({ erro: 'Senha invalida.' }, { status: 401 })
  }

  const token = await assinarSessao(
    segredoObrigatorio('APP_SESSAO_SEGREDO'),
    DURACAO_SESSAO_SEGUNDOS,
  )

  const resposta = NextResponse.json({ ok: true })
  resposta.cookies.set(COOKIE_SESSAO, token, {
    httpOnly: true,   // JavaScript da pagina nao consegue ler
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  })
  return resposta
}
```

- [ ] **Step 3: Criar a rota de logout**

Criar `app/api/logout/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { COOKIE_SESSAO } from '@/lib/auth/config'

export async function POST() {
  const resposta = NextResponse.json({ ok: true })
  resposta.cookies.set(COOKIE_SESSAO, '', { path: '/', maxAge: 0 })
  return resposta
}
```

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add app/api lib/auth/config.ts
git commit -m "feat(auth): rotas de login e logout"
```

---

### Task 5: Middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Implementar**

Criar `middleware.ts` na raiz do projeto:

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { verificarSessao } from '@/lib/auth/sessao'
import { COOKIE_SESSAO } from '@/lib/auth/config'

/**
 * Bloqueia tudo que nao tenha cookie de sessao valido.
 *
 * Roda no Edge Runtime, entao so pode usar Web Crypto — por isso verifica a
 * assinatura do cookie em vez da senha. A senha e verificada uma unica vez,
 * na rota de login, que roda em Node.
 */
export async function middleware(requisicao: NextRequest) {
  const segredo = process.env.APP_SESSAO_SEGREDO
  if (!segredo) {
    // Sem segredo configurado, negar tudo. Falhar aberto deixaria a aplicacao
    // exposta silenciosamente.
    return new NextResponse('Aplicacao nao configurada.', { status: 503 })
  }

  const token = requisicao.cookies.get(COOKIE_SESSAO)?.value
  if (token && (await verificarSessao(segredo, token))) {
    return NextResponse.next()
  }

  const url = requisicao.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  /**
   * Protege tudo, menos:
   *  - /login e /api/login, senao ninguem consegue entrar
   *  - /_next/* e favicon, arquivos estaticos do proprio framework
   *
   * A rota de API do comparativo fica protegida de proposito: deixar o calculo
   * aberto anularia a tranca da tela.
   */
  matcher: ['/((?!login|api/login|_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): middleware protege as rotas no Edge"
```

---

### Task 6: Tela de login

**Files:**
- Create: `app/login/page.tsx`

Tela mínima e funcional. O tema visual completo vem na fase da interface.

- [ ] **Step 1: Implementar**

Criar `app/login/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/login
git commit -m "feat(auth): tela de login"
```

---

### Task 7: Teste de vazamento de segredo

**Files:**
- Create: `tests/segredos.test.ts`

Este teste existe porque expor um segredo no bundle é o erro mais fácil de cometer em Next.js e o mais difícil de perceber: nada quebra, o site funciona, e o segredo fica público.

- [ ] **Step 1: Escrever o teste**

Criar `tests/segredos.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function arquivos(raiz: string, extensao: string): string[] {
  const encontrados: string[] = []
  function percorrer(caminho: string) {
    for (const entrada of readdirSync(caminho)) {
      const completo = join(caminho, entrada)
      if (statSync(completo).isDirectory()) percorrer(completo)
      else if (completo.endsWith(extensao)) encontrados.push(completo)
    }
  }
  percorrer(raiz)
  return encontrados
}

describe('segredos nao vazam para o cliente', () => {
  it('nenhuma variavel de segredo usa o prefixo NEXT_PUBLIC_', () => {
    // Uma variavel NEXT_PUBLIC_* e embutida no JavaScript servido ao navegador.
    const fontes = [
      ...arquivos('lib', '.ts'),
      ...arquivos('app', '.tsx'),
      ...arquivos('app', '.ts'),
      'middleware.ts',
    ]
    const suspeitos: string[] = []
    for (const arquivo of fontes) {
      const conteudo = readFileSync(arquivo, 'utf8')
      if (/NEXT_PUBLIC_[A-Z_]*(SENHA|SEGREDO|SECRET|TOKEN|HASH)/.test(conteudo)) {
        suspeitos.push(arquivo)
      }
    }
    expect(suspeitos).toEqual([])
  })

  it('o .env.example nao tem valores preenchidos', () => {
    const conteudo = readFileSync('.env.example', 'utf8')
    const preenchidas = conteudo
      .split('\n')
      .filter((linha) => /^[A-Z_]+=.+/.test(linha.trim()))
    expect(preenchidas).toEqual([])
  })

  it('o .gitignore bloqueia os arquivos .env', () => {
    const conteudo = readFileSync('.gitignore', 'utf8')
    expect(conteudo).toMatch(/^\.env$/m)
    expect(conteudo).toMatch(/^\.env\.local$/m)
  })

  it('o segredo de sessao so e lido em codigo de servidor', () => {
    // Um arquivo com "use client" que leia o segredo o entregaria ao navegador.
    const clientes = [...arquivos('app', '.tsx')].filter((arquivo) =>
      readFileSync(arquivo, 'utf8').includes("'use client'"),
    )
    const vazando = clientes.filter((arquivo) => {
      const conteudo = readFileSync(arquivo, 'utf8')
      return conteudo.includes('APP_SESSAO_SEGREDO') || conteudo.includes('APP_SENHA_HASH')
    })
    expect(vazando).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar**

Run: `npm run test -- tests/segredos.test.ts`
Expected: PASS, 4 testes.

- [ ] **Step 3: Rodar a suíte inteira**

Run: `npm run test`
Expected: PASS. Reporte o total (era 41 antes desta fase).

- [ ] **Step 4: Commit**

```bash
git add tests/segredos.test.ts
git commit -m "test(auth): garante que os segredos nao chegam ao cliente"
```

---

### Task 8: Verificação de ponta a ponta

**Files:**
- Create: `.env.local` (não versionado)

- [ ] **Step 1: Gerar os segredos**

```bash
npx tsx scripts/gerar-hash.ts multicotador-teste-2026
node -e "console.log('APP_SESSAO_SEGREDO=' + require('crypto').randomBytes(32).toString('hex'))"
```

Criar `.env.local` com as duas linhas produzidas pelos comandos acima.

- [ ] **Step 2: Confirmar que o .env.local não é versionado**

Run: `git status --short`
Expected: `.env.local` **não** aparece na lista.

Run: `git check-ignore -v .env.local`
Expected: aponta a regra do `.gitignore` que o cobre.

Se o arquivo aparecer como não rastreado, PARE — o `.gitignore` está errado e um commit vazaria a senha.

- [ ] **Step 3: Subir a aplicação**

Run: `npm run dev`

- [ ] **Step 4: Verificar o comportamento**

Com o servidor rodando, em outro terminal:

```bash
# sem cookie: deve redirecionar para /login (307 ou 308)
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/

# senha errada: 401
curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" -d '{"senha":"errada"}' -w "\n%{http_code}\n"

# senha certa: 200 e Set-Cookie
curl -s -i -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" -d '{"senha":"multicotador-teste-2026"}' | grep -i "set-cookie\|HTTP/"
```

Esperado: redirecionamento para `/login`; 401 na senha errada; 200 com `Set-Cookie: mc_sessao=...; HttpOnly; SameSite=Strict` na senha certa.

- [ ] **Step 5: Verificar que o cookie funciona**

```bash
curl -s -c cookies.txt -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" -d '{"senha":"multicotador-teste-2026"}' > /dev/null
curl -s -b cookies.txt -o /dev/null -w "%{http_code}\n" http://localhost:3000/
rm cookies.txt
```

Esperado: `200` — com o cookie, a raiz abre.

- [ ] **Step 6: Verificar o limite de tentativas**

```bash
for i in 1 2 3 4 5 6; do
  curl -s -X POST http://localhost:3000/api/login \
    -H "Content-Type: application/json" -d '{"senha":"errada"}' -o /dev/null -w "$i: %{http_code}\n"
done
```

Esperado: 401 nas cinco primeiras, **429** na sexta.

- [ ] **Step 7: Documentar no README**

Acrescentar ao `README.md` uma seção explicando como configurar as variáveis:

```markdown
## Configuração

Copie `.env.example` para `.env.local` e preencha:

- `APP_SENHA_HASH` — gere com `npx tsx scripts/gerar-hash.ts <sua-senha>`
- `APP_SESSAO_SEGREDO` — gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Na Vercel, cadastre as duas em Settings → Environment Variables. **Nenhuma das
duas leva o prefixo `NEXT_PUBLIC_`** — variáveis com esse prefixo são embutidas
no JavaScript enviado ao navegador.
```

- [ ] **Step 8: Commit**

```bash
git add README.md
git commit -m "docs: como configurar os segredos de acesso"
```

---

## Verificação final da fase

- [ ] `npm run test` passa inteiro
- [ ] `npx tsc --noEmit` sem erros
- [ ] `.env.local` existe localmente e **não** está versionado
- [ ] Sem cookie, qualquer rota redireciona para `/login`
- [ ] Senha errada devolve 401; a sexta tentativa devolve 429
- [ ] Senha certa devolve 200 com cookie `HttpOnly` e `SameSite=Strict`
- [ ] Com o cookie, a raiz abre normalmente

## Fora do escopo desta fase

Formulário de cotação, tela de resultado, tema visual completo e geração do PDF.
A raiz continua sendo a página padrão do Next.js — apenas protegida.
