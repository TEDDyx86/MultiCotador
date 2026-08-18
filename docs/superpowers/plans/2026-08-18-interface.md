# Interface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela onde o corretor informa os dados do cliente e vê o comparativo entre as seguradoras, com tema cofre e animações.

**Architecture:** O cálculo roda em Server Action. O cliente envia sexo, idade e capital; recebe apenas as linhas do resultado. As tabelas de tarifa nunca entram no bundle do navegador.

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript, Tailwind v4, Motion (`motion/react`), Vitest.

---

## Por que Server Action, e não cálculo no cliente

As tabelas de tarifa são o ativo do negócio — 722 tarifas extraídas de 785 estudos. `dados/tarifas.json` tem cerca de 300 KB.

Se um componente cliente importar o repositório, esses 300 KB vão para o bundle e qualquer pessoa com acesso à tela baixa a base inteira abrindo o DevTools. A senha protege o acesso, não o dado depois de servido.

Com Server Action, o navegador envia `{sexo, idade, capital}` e recebe quatro linhas de números. Como efeito colateral, a tela fica leve.

**Regra que decorre disso:** nenhum arquivo com `'use client'` pode importar de `lib/repositorio` ou `lib/motor`. Um teste garante isso.

## Decisões de interface

O que a tela precisa mostrar e o PDF não prevê:

1. **Produto inelegível** — aos 79 anos só a MAG Integral cota. As demais aparecem esmaecidas, com o motivo.
2. **Teto de capital** — MAG Sucessão aceita no máximo R$ 700 mil a partir dos 78 anos.
3. **Break-even real** — o documento sempre diz 10º ano, mas acima de 55 anos o resgate frequentemente não alcança o aportado. O corretor vê a verdade na tela.
4. **Tarifa estimada** — a linha MAG Sucessão homem 63 anos é a única `ESTIMADO` da base.

A tela cota os **6 produtos** (os sucessórios costumam ser bem mais baratos e interessam na conversa). O comparativo em PDF usa os **4 com resgate**.

## Paleta

| Uso | Cor |
|---|---|
| Fundo profundo | `#0A1A33` |
| Placa metálica | `#132844` → `#1C3557` |
| Borda | `#1C3557` |
| Acento | `#22A7F0` |
| Texto | `#E8EEF7` |
| Texto secundário | `#8FA3BF` |
| Alerta | `#F0A722` |

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/formato.ts` | Formatação de moeda, data e percentual em pt-BR |
| `app/acoes.ts` | Server Action de cotação |
| `app/page.tsx` | Página (Server Component) |
| `app/componentes/Cabecalho.tsx` | Header com a logo RT |
| `app/componentes/CampoMoeda.tsx` | Entrada de capital com máscara |
| `app/componentes/FormularioCotacao.tsx` | Formulário |
| `app/componentes/Resultado.tsx` | Ranking e tabela |
| `app/componentes/ValorAnimado.tsx` | Contagem animada |
| `tests/formato.test.ts` | Formatação |
| `tests/acoes.test.ts` | Server Action |
| `tests/bundle.test.ts` | Garante que as tabelas não vazam para o cliente |

---

### Task 1: Dependências, ativos e formatação

**Files:**
- Modify: `package.json`, `app/globals.css`
- Create: `lib/formato.ts`, `tests/formato.test.ts`
- Move: as imagens da raiz para `public/`

- [ ] **Step 1: Instalar o Motion**

```bash
npm install motion
```

Nota: a biblioteca antes chamada `framer-motion` hoje se chama `motion`, e o import é `motion/react`.

- [ ] **Step 2: Mover as imagens para `public/`**

As logos estão na raiz do repositório. O Next só serve arquivos estáticos de `public/`.

```bash
mkdir -p public/marcas
git mv logo-rt-horizontal-white.png public/marcas/rt-horizontal-branca.png
git mv logo_blue-3-investimentos_KV3eRO.png public/marcas/blue3.png
git mv logo_icatu.png public/marcas/icatu.png
git mv mag-logo.png public/marcas/mag.png
git mv metlife-logo.png public/marcas/metlife.png
git mv Prudential-Logo.png public/marcas/prudential.png
git mv header-pattern.png public/marcas/textura-cabecalho.png
```

- [ ] **Step 3: Atualizar os caminhos de logo em `pipeline/gerar_dados.py`**

Na lista `PRODUTOS`, trocar cada `"logo"` para o novo caminho:
- `"logo_icatu.png"` → `"/marcas/icatu.png"`
- `"mag-logo.png"` → `"/marcas/mag.png"`
- `"metlife-logo.png"` → `"/marcas/metlife.png"`
- `"Prudential-Logo.png"` → `"/marcas/prudential.png"`

Depois rodar `python pipeline/gerar_dados.py` e confirmar que `dados/produtos.json` traz os caminhos novos.

- [ ] **Step 4: Escrever o teste de formatação**

Criar `tests/formato.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { moeda, moedaCurta, percentual, dataExtenso } from '@/lib/formato'

describe('moeda', () => {
  it('formata em reais com separador de milhar', () => {
    expect(moeda(new Decimal('57248.94'))).toBe('R$ 57.248,94')
  })

  it('mantem duas casas em valores redondos', () => {
    expect(moeda(new Decimal('1000000'))).toBe('R$ 1.000.000,00')
  })

  it('formata zero', () => {
    expect(moeda(new Decimal('0'))).toBe('R$ 0,00')
  })
})

describe('moedaCurta', () => {
  it('abrevia milhoes', () => {
    expect(moedaCurta(new Decimal('1000000'))).toBe('R$ 1,0 mi')
    expect(moedaCurta(new Decimal('2500000'))).toBe('R$ 2,5 mi')
  })

  it('abrevia milhares', () => {
    expect(moedaCurta(new Decimal('700000'))).toBe('R$ 700 mil')
  })

  it('mantem valores pequenos por extenso', () => {
    expect(moedaCurta(new Decimal('850'))).toBe('R$ 850,00')
  })
})

describe('percentual', () => {
  it('usa virgula decimal', () => {
    expect(percentual(new Decimal('57.2'))).toBe('57,2%')
  })
})

describe('dataExtenso', () => {
  it('escreve a data por extenso em portugues', () => {
    expect(dataExtenso(new Date(2026, 7, 18))).toBe('18 de agosto de 2026')
  })
})
```

- [ ] **Step 5: Rodar e confirmar que falha**

Run: `npm run test -- tests/formato.test.ts`
Expected: FAIL, não resolve `@/lib/formato`.

- [ ] **Step 6: Implementar**

Criar `lib/formato.ts`:

```typescript
import type Decimal from 'decimal.js'

const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/**
 * O Intl usa espaco nao-quebravel depois de "R$" (U+00A0), que impede o simbolo
 * de se separar do numero na quebra de linha. Normalizamos para espaco comum
 * porque os testes e a comparacao de strings ficam impossiveis de ler com ele.
 */
export function moeda(valor: Decimal): string {
  return MOEDA.format(valor.toNumber()).replace(/ /g, ' ')
}

/** Versao compacta, para titulos e cartoes onde o valor cheio nao cabe. */
export function moedaCurta(valor: Decimal): string {
  const numero = valor.toNumber()
  if (numero >= 1_000_000) {
    const milhoes = (numero / 1_000_000).toFixed(1).replace('.', ',')
    return `R$ ${milhoes} mi`
  }
  if (numero >= 1_000) {
    return `R$ ${Math.round(numero / 1_000)} mil`
  }
  return moeda(valor)
}

export function percentual(valor: Decimal): string {
  return `${valor.toFixed(1).replace('.', ',')}%`
}

export function dataExtenso(data: Date): string {
  return `${data.getDate()} de ${MESES[data.getMonth()]} de ${data.getFullYear()}`
}
```

- [ ] **Step 7: Rodar e confirmar que passa**

Run: `npm run test -- tests/formato.test.ts`
Expected: PASS, 9 testes.

- [ ] **Step 8: Definir o tema no CSS**

Em `app/globals.css`, acrescentar dentro do bloco `@theme` (Tailwind v4):

```css
@theme {
  --color-cofre-fundo: #0A1A33;
  --color-cofre-placa: #132844;
  --color-cofre-placa-clara: #1C3557;
  --color-cofre-borda: #1C3557;
  --color-cofre-acento: #22A7F0;
  --color-cofre-texto: #E8EEF7;
  --color-cofre-suave: #8FA3BF;
  --color-cofre-alerta: #F0A722;
}
```

Se o arquivo não tiver bloco `@theme`, criar um após o `@import "tailwindcss";`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(ui): tema, formatacao pt-BR e ativos de marca em public/"
```

---

### Task 2: Server Action de cotação

**Files:**
- Create: `app/acoes.ts`, `tests/acoes.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `tests/acoes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { cotarComparativo } from '@/app/acoes'

describe('acao de cotacao', () => {
  it('devolve as quatro seguradoras do comparativo', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 50, capital: '1000000' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.comparativo.map((l) => l.seguradora)).toEqual([
      'MAG', 'MetLife', 'Prudential', 'Icatu',
    ])
  })

  it('reproduz os aportes do documento de referencia', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 50, capital: '1000000' })
    if (!r.ok) throw new Error('deveria ter cotado')
    expect(r.comparativo.map((l) => l.aporteAnual)).toEqual([
      'R$ 57.248,94', 'R$ 59.922,68', 'R$ 60.542,49', 'R$ 63.053,16',
    ])
  })

  it('devolve os seis produtos na lista completa', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 40, capital: '1000000' })
    if (!r.ok) throw new Error('deveria ter cotado')
    expect(r.todos.length).toBe(6)
  })

  it('lista os indisponiveis com o motivo', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 79, capital: '1000000' })
    if (!r.ok) throw new Error('deveria ter cotado')
    expect(r.indisponiveis.length).toBeGreaterThan(0)
    expect(r.indisponiveis.some((i) => /700/.test(i.motivo))).toBe(true)
  })

  it('recusa idade fora de qualquer produto', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 120, capital: '1000000' })
    expect(r.ok).toBe(false)
  })

  it('recusa capital nao numerico', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 40, capital: 'abc' })
    expect(r.ok).toBe(false)
  })

  it('recusa capital zero', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 40, capital: '0' })
    expect(r.ok).toBe(false)
  })

  it('aceita capital acima de um milhao com centavos', async () => {
    const r = await cotarComparativo({ sexo: 'F', idade: 40, capital: '2500000.55' })
    expect(r.ok).toBe(true)
  })

  it('expoe o break-even real, diferente do documento', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 62, capital: '1000000' })
    if (!r.ok) throw new Error('deveria ter cotado')
    const mag = r.comparativo.find((l) => l.seguradora === 'MAG')!
    expect(mag.breakevenDocumento).toBe(10)
    expect(mag.breakevenReal).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- tests/acoes.test.ts`
Expected: FAIL, não resolve `@/app/acoes`.

- [ ] **Step 3: Implementar**

Criar `app/acoes.ts`:

```typescript
'use server'

import Decimal from 'decimal.js'
import { montarComparativo } from '@/lib/motor/comparativo'
import { multicotar } from '@/lib/motor/cotacao'
import { repositorioJson } from '@/lib/repositorio/repositorioJson'
import { moeda, percentual } from '@/lib/formato'
import type { Sexo } from '@/lib/dominio/tipos'

export interface Entrada {
  sexo: Sexo
  idade: number
  capital: string
}

/** Tudo ja formatado: o cliente nao recebe Decimal nem a tabela de tarifas. */
export interface LinhaResultado {
  produtoId: string
  seguradora: string
  logo: string
  aporteAnual: string
  aporteMensal: string
  aporteAcumulado10a: string
  custoSobreCapital: string
  breakevenDocumento: number
  breakevenReal: number | null
  resgate10a: string
  /** Verdadeiro quando o resgate no 10o ano nao alcanca o aportado. */
  resgateAbaixoDoAportado: boolean
  estimada: boolean
}

export interface LinhaProduto {
  produtoId: string
  seguradora: string
  nome: string
  logo: string
  aporteAnual: string
  aporteMensal: string
  estimada: boolean
}

export type Resultado =
  | {
      ok: true
      comparativo: LinhaResultado[]
      todos: LinhaProduto[]
      indisponiveis: Array<{ produtoId: string; motivo: string }>
      valorPreservado: string
    }
  | { ok: false; erro: string }

export async function cotarComparativo(entrada: Entrada): Promise<Resultado> {
  let capital: Decimal
  try {
    capital = new Decimal(entrada.capital)
  } catch {
    return { ok: false, erro: 'Informe um capital segurado valido.' }
  }
  if (!capital.isFinite() || capital.lessThanOrEqualTo(0)) {
    return { ok: false, erro: 'O capital segurado deve ser maior que zero.' }
  }
  if (!Number.isInteger(entrada.idade)) {
    return { ok: false, erro: 'Idade invalida.' }
  }

  const repo = repositorioJson
  const { cotacoes, indisponiveis } = multicotar(repo, entrada.sexo, entrada.idade, capital)

  if (cotacoes.length === 0) {
    return {
      ok: false,
      erro: `Nenhuma seguradora cota aos ${entrada.idade} anos com esse capital.`,
    }
  }

  const comp = montarComparativo(repo, entrada.sexo, entrada.idade, capital)

  return {
    ok: true,
    valorPreservado: moeda(comp.valorPreservado),
    indisponiveis,
    comparativo: comp.linhas.map((l) => ({
      produtoId: l.produtoId,
      seguradora: l.seguradora,
      logo: l.logo,
      aporteAnual: moeda(l.aporteAnual),
      aporteMensal: moeda(l.aporteAnual.dividedBy(12)),
      aporteAcumulado10a: moeda(l.aporteAcumulado10a),
      custoSobreCapital: percentual(l.custoSobreCapital),
      breakevenDocumento: l.breakevenDocumento,
      breakevenReal: l.breakevenReal,
      resgate10a: moeda(l.resgate10a),
      resgateAbaixoDoAportado: l.resgate10a.lessThan(l.aporteAcumulado10a),
      estimada: l.fonteTarifa === 'ESTIMADO',
    })),
    todos: cotacoes.map((c) => ({
      produtoId: c.produto.id,
      seguradora: c.produto.seguradora,
      nome: c.produto.nome,
      logo: c.produto.logo,
      aporteAnual: moeda(c.premioAnualComIof),
      aporteMensal: moeda(c.premioMensalComIof),
      estimada: c.fonteTarifa === 'ESTIMADO',
    })),
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test -- tests/acoes.test.ts`
Expected: PASS, 9 testes.

- [ ] **Step 5: Commit**

```bash
git add app/acoes.ts tests/acoes.test.ts
git commit -m "feat(ui): server action de cotacao, mantem tarifas no servidor"
```

---

### Task 3: Cabeçalho e layout

**Files:**
- Create: `app/componentes/Cabecalho.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Criar o cabeçalho**

Criar `app/componentes/Cabecalho.tsx`:

```tsx
import Image from 'next/image'

export function Cabecalho() {
  return (
    <header className="relative overflow-hidden border-b border-cofre-borda bg-cofre-placa">
      {/* Textura de aco, discreta: da peso de metal sem competir com o conteudo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'url(/marcas/textura-cabecalho.png)',
          backgroundSize: '360px',
        }}
      />
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Image
          src="/marcas/rt-horizontal-branca.png"
          alt="Robson Tavernard"
          width={1558}
          height={400}
          priority
          className="h-8 w-auto"
        />
        <p className="hidden text-right text-xs uppercase tracking-[0.18em] text-cofre-suave sm:block">
          Planejamento patrimonial
          <br />e sucessório
        </p>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Ajustar o layout raiz**

Substituir o conteúdo de `app/layout.tsx` por:

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Multicotador | Robson Tavernard',
  description: 'Comparativo de seguros de vida Whole Life entre seguradoras',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-cofre-fundo text-cofre-texto antialiased">
        {children}
      </body>
    </html>
  )
}
```

Preserve qualquer configuração de fonte que já exista no arquivo.

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add app/componentes/Cabecalho.tsx app/layout.tsx
git commit -m "feat(ui): cabecalho com a marca e layout base"
```

---

### Task 4: Campo de moeda e formulário

**Files:**
- Create: `app/componentes/CampoMoeda.tsx`, `app/componentes/FormularioCotacao.tsx`
- Modify: `lib/formato.ts`, `tests/formato.test.ts`

- [ ] **Step 1: Acrescentar o parser de moeda ao teste**

Acrescentar em `tests/formato.test.ts`:

```typescript
import { moedaParaNumero, numeroParaMascara } from '@/lib/formato'

describe('entrada de moeda', () => {
  it('extrai o numero de um texto formatado', () => {
    expect(moedaParaNumero('R$ 1.000.000,00')).toBe('1000000.00')
    expect(moedaParaNumero('2.500.000,55')).toBe('2500000.55')
  })

  it('devolve string vazia quando nao ha digito', () => {
    expect(moedaParaNumero('R$ ')).toBe('')
    expect(moedaParaNumero('abc')).toBe('')
  })

  it('monta a mascara a partir dos digitos', () => {
    // O usuario digita so numeros; os centavos entram da direita para a esquerda
    expect(numeroParaMascara('100000000')).toBe('1.000.000,00')
    expect(numeroParaMascara('5')).toBe('0,05')
    expect(numeroParaMascara('')).toBe('')
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

- [ ] **Step 3: Acrescentar a `lib/formato.ts`**

```typescript
/** Converte o texto exibido no campo para um numero em formato decimal. */
export function moedaParaNumero(texto: string): string {
  const digitos = texto.replace(/\D/g, '')
  if (digitos === '') return ''
  const centavos = digitos.padStart(3, '0')
  const inteiros = centavos.slice(0, -2).replace(/^0+(?=\d)/, '')
  return `${inteiros}.${centavos.slice(-2)}`
}

/**
 * Monta a mascara a partir dos digitos crus. O usuario digita apenas numeros e
 * os centavos se formam da direita para a esquerda, como numa calculadora —
 * evita ter que posicionar cursor no meio de pontuacao.
 */
export function numeroParaMascara(digitos: string): string {
  const limpos = digitos.replace(/\D/g, '')
  if (limpos === '') return ''
  const centavos = limpos.padStart(3, '0')
  const inteiros = centavos.slice(0, -2).replace(/^0+(?=\d)/, '')
  const comMilhar = inteiros.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${comMilhar},${centavos.slice(-2)}`
}
```

- [ ] **Step 4: Rodar e confirmar que passa** (12 testes em formato.test.ts)

- [ ] **Step 5: Criar o campo de moeda**

Criar `app/componentes/CampoMoeda.tsx`:

```tsx
'use client'

import { numeroParaMascara } from '@/lib/formato'

interface Props {
  id: string
  valor: string
  aoMudar: (digitos: string) => void
}

export function CampoMoeda({ id, valor, aoMudar }: Props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cofre-suave">
        R$
      </span>
      <input
        id={id}
        inputMode="numeric"
        value={numeroParaMascara(valor)}
        onChange={(e) => aoMudar(e.target.value.replace(/\D/g, ''))}
        placeholder="0,00"
        className="w-full rounded-md border border-cofre-borda bg-cofre-fundo py-2.5 pl-10 pr-3
                   text-right font-medium text-cofre-texto shadow-inner outline-none
                   transition-colors focus:border-cofre-acento"
      />
    </div>
  )
}
```

- [ ] **Step 6: Criar o formulário**

Criar `app/componentes/FormularioCotacao.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { motion } from 'motion/react'
import { cotarComparativo, type Resultado } from '@/app/acoes'
import { idadeEm } from '@/lib/dominio/regras'
import { CampoMoeda } from './CampoMoeda'
import type { Sexo } from '@/lib/dominio/tipos'

const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)']
const REGIMES = [
  'Comunhão parcial de bens',
  'Comunhão universal de bens',
  'Separação total de bens',
  'Participação final nos aquestos',
]

const rotulo = 'mb-1.5 block text-xs uppercase tracking-wider text-cofre-suave'
const campo =
  'w-full rounded-md border border-cofre-borda bg-cofre-fundo px-3 py-2.5 text-cofre-texto ' +
  'shadow-inner outline-none transition-colors focus:border-cofre-acento'

interface Props {
  aoResultado: (resultado: Resultado | null, nome: string) => void
}

export function FormularioCotacao({ aoResultado }: Props) {
  const [nome, setNome] = useState('')
  const [sexo, setSexo] = useState<Sexo>('M')
  const [nascimento, setNascimento] = useState('')
  const [estadoCivil, setEstadoCivil] = useState(ESTADOS_CIVIS[0])
  const [regimeBens, setRegimeBens] = useState(REGIMES[0])
  const [profissao, setProfissao] = useState('')
  const [capital, setCapital] = useState('100000000') // R$ 1.000.000,00
  const [processando, iniciarTransicao] = useTransition()

  const idade = nascimento ? idadeEm(new Date(`${nascimento}T00:00:00`), new Date()) : null
  const idadeValida = idade !== null && idade >= 0 && idade <= 120
  const podeEnviar = nome.trim().length > 0 && idadeValida && capital.length > 0

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!podeEnviar || idade === null) return

    iniciarTransicao(async () => {
      const digitos = capital.padStart(3, '0')
      const valor = `${digitos.slice(0, -2).replace(/^0+(?=\d)/, '')}.${digitos.slice(-2)}`
      aoResultado(await cotarComparativo({ sexo, idade, capital: valor }), nome.trim())
    })
  }

  return (
    <form onSubmit={enviar} className="rounded-xl border border-cofre-borda bg-cofre-placa p-6">
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-cofre-acento">
        Dados do cliente
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="nome" className={rotulo}>Nome completo</label>
          <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)}
                 className={campo} autoComplete="off" />
        </div>

        <div>
          <label htmlFor="nascimento" className={rotulo}>Data de nascimento</label>
          <input id="nascimento" type="date" value={nascimento}
                 onChange={(e) => setNascimento(e.target.value)} className={campo} />
          {idade !== null && (
            <p className="mt-1 text-xs text-cofre-suave">
              {idadeValida ? `${idade} anos` : 'Data invalida'}
            </p>
          )}
        </div>

        <div>
          <span className={rotulo}>Sexo</span>
          <div className="flex gap-2">
            {(['M', 'F'] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => setSexo(opcao)}
                aria-pressed={sexo === opcao}
                className={`flex-1 rounded-md border py-2.5 text-sm transition-colors ${
                  sexo === opcao
                    ? 'border-cofre-acento bg-cofre-acento/10 text-cofre-acento'
                    : 'border-cofre-borda text-cofre-suave hover:border-cofre-placa-clara'
                }`}
              >
                {opcao === 'M' ? 'Masculino' : 'Feminino'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="estadoCivil" className={rotulo}>Estado civil</label>
          <select id="estadoCivil" value={estadoCivil}
                  onChange={(e) => setEstadoCivil(e.target.value)} className={campo}>
            {ESTADOS_CIVIS.map((e) => <option key={e}>{e}</option>)}
          </select>
        </div>

        {(estadoCivil === 'Casado(a)' || estadoCivil === 'União estável') && (
          <div>
            <label htmlFor="regime" className={rotulo}>Regime de bens</label>
            <select id="regime" value={regimeBens}
                    onChange={(e) => setRegimeBens(e.target.value)} className={campo}>
              {REGIMES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="profissao" className={rotulo}>Profissão</label>
          <input id="profissao" value={profissao} onChange={(e) => setProfissao(e.target.value)}
                 className={campo} autoComplete="off" />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="capital" className={rotulo}>Capital segurado</label>
          <CampoMoeda id="capital" valor={capital} aoMudar={setCapital} />
        </div>
      </div>

      <motion.button
        type="submit"
        disabled={!podeEnviar || processando}
        whileTap={{ scale: 0.985 }}
        className="relative mt-6 w-full overflow-hidden rounded-md bg-cofre-acento py-3
                   font-semibold text-cofre-fundo transition-opacity disabled:opacity-35"
      >
        {/* O anel gira como o volante de um cofre enquanto calcula */}
        {processando && (
          <motion.span
            aria-hidden
            className="absolute inset-0 border-2 border-cofre-fundo/30 border-t-cofre-fundo"
            style={{ borderRadius: 6 }}
            animate={{ rotate: 270 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <span className="relative">{processando ? 'Destravando...' : 'Gerar comparativo'}</span>
      </motion.button>
    </form>
  )
}
```

- [ ] **Step 7: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add lib/formato.ts tests/formato.test.ts app/componentes
git commit -m "feat(ui): formulario de cotacao com mascara de moeda"
```

---

### Task 5: Valor animado e resultado

**Files:**
- Create: `app/componentes/ValorAnimado.tsx`, `app/componentes/Resultado.tsx`

- [ ] **Step 1: Criar o valor animado**

Criar `app/componentes/ValorAnimado.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

/**
 * Conta ate o valor final em vez de aparecer pronto. Reforca a leitura de
 * medidor e da peso ao momento do resultado.
 * O texto ja vem formatado do servidor; a animacao interpola so os digitos,
 * preservando pontuacao e simbolo.
 */
export function ValorAnimado({ texto, duracao = 700 }: { texto: string; duracao?: number }) {
  const reduzirMovimento = useReducedMotion()
  const [exibido, setExibido] = useState(reduzirMovimento ? texto : '')
  const quadro = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (reduzirMovimento) {
      setExibido(texto)
      return
    }

    const alvo = Number(texto.replace(/\D/g, ''))
    if (!Number.isFinite(alvo) || alvo === 0) {
      setExibido(texto)
      return
    }

    const inicio = performance.now()

    function passo(agora: number) {
      const progresso = Math.min((agora - inicio) / duracao, 1)
      // Desaceleracao cubica: rapido no comeco, assenta no fim
      const suave = 1 - Math.pow(1 - progresso, 3)
      const parcial = Math.round(alvo * suave).toString().padStart(
        texto.replace(/\D/g, '').length,
        '0',
      )

      let indice = 0
      setExibido(texto.replace(/\d/g, () => parcial[indice++] ?? '0'))

      if (progresso < 1) quadro.current = requestAnimationFrame(passo)
      else setExibido(texto)
    }

    quadro.current = requestAnimationFrame(passo)
    return () => {
      if (quadro.current !== undefined) cancelAnimationFrame(quadro.current)
    }
  }, [texto, duracao, reduzirMovimento])

  return <span className="tabular-nums">{exibido || texto}</span>
}
```

- [ ] **Step 2: Criar o resultado**

Criar `app/componentes/Resultado.tsx`:

```tsx
'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import type { Resultado as TipoResultado } from '@/app/acoes'
import { ValorAnimado } from './ValorAnimado'

const entrada = {
  oculto: { opacity: 0, y: 12 },
  visivel: (indice: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: indice * 0.07, duration: 0.35, ease: 'easeOut' as const },
  }),
}

export function Resultado({ resultado, nome }: { resultado: TipoResultado; nome: string }) {
  if (!resultado.ok) {
    return (
      <div role="alert" className="rounded-xl border border-cofre-alerta/40 bg-cofre-alerta/10 p-6">
        <p className="text-cofre-alerta">{resultado.erro}</p>
      </div>
    )
  }

  const { comparativo, todos, indisponiveis, valorPreservado } = resultado
  const algumEstimado = comparativo.some((l) => l.estimada)
  const algumAbaixo = comparativo.some((l) => l.resgateAbaixoDoAportado)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-cofre-acento">
          Ranking por aporte anual
        </h2>
        {nome && <p className="mt-1 text-sm text-cofre-suave">Estudo para {nome}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {comparativo.map((linha, indice) => (
          <motion.article
            key={linha.produtoId}
            custom={indice}
            initial="oculto"
            animate="visivel"
            variants={entrada}
            className={`rounded-xl border p-4 ${
              indice === 0
                ? 'border-cofre-acento bg-cofre-acento/[0.07] shadow-[0_0_28px_-8px_#22A7F0]'
                : 'border-cofre-borda bg-cofre-placa'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-cofre-suave">
                {indice + 1}º{indice === 0 && ' • recomendada'}
              </span>
              <Image src={linha.logo} alt={linha.seguradora} width={60} height={20}
                     className="h-4 w-auto object-contain opacity-80" />
            </div>
            <p className="text-lg font-semibold">
              <ValorAnimado texto={linha.aporteAnual} />
            </p>
            <p className="mt-0.5 text-xs text-cofre-suave">
              {linha.aporteMensal} por mês
            </p>
          </motion.article>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="overflow-x-auto rounded-xl border border-cofre-borda bg-cofre-placa"
      >
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-cofre-borda text-left text-xs uppercase tracking-wider text-cofre-suave">
              <th className="px-4 py-3 font-medium">Critério</th>
              {comparativo.map((l) => (
                <th key={l.produtoId} className="px-4 py-3 font-medium text-cofre-texto">
                  {l.seguradora}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-cofre-borda/60">
            <Linha titulo="Aporte anual" valores={comparativo.map((l) => l.aporteAnual)} />
            <Linha titulo="Acumulado em 10 anos"
                   valores={comparativo.map((l) => l.aporteAcumulado10a)} />
            <Linha titulo="Custo vs capital segurado"
                   valores={comparativo.map((l) => l.custoSobreCapital)} />
            <Linha titulo="Resgate no 10º ano"
                   valores={comparativo.map((l) => l.resgate10a)} />
            <tr>
              <th scope="row" className="px-4 py-3 text-left font-normal text-cofre-suave">
                Break-even real
              </th>
              {comparativo.map((l) => (
                <td key={l.produtoId} className="px-4 py-3">
                  {l.breakevenReal === null ? (
                    <span className="text-cofre-alerta">não atinge</span>
                  ) : (
                    `${l.breakevenReal}º ano`
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
        className="rounded-xl border border-cofre-acento/30 bg-gradient-to-r from-cofre-placa to-cofre-placa-clara p-5"
      >
        <p className="text-xs uppercase tracking-[0.18em] text-cofre-suave">
          Valor preservado em 10 anos
        </p>
        <p className="mt-1 text-2xl font-semibold text-cofre-acento">
          <ValorAnimado texto={valorPreservado} duracao={900} />
        </p>
      </motion.div>

      {(algumAbaixo || algumEstimado || indisponiveis.length > 0) && (
        <div className="space-y-2 rounded-xl border border-cofre-alerta/30 bg-cofre-alerta/[0.06] p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-cofre-alerta">
            Atenção do corretor
          </p>
          {algumAbaixo && (
            <p className="text-cofre-suave">
              Em uma ou mais seguradoras o resgate no 10º ano não alcança o total aportado.
              O documento apresenta o 10º ano como break-even.
            </p>
          )}
          {algumEstimado && (
            <p className="text-cofre-suave">
              Uma das tarifas é estimada por interpolação, não veio de estudo oficial.
            </p>
          )}
          {indisponiveis.map((i) => (
            <p key={i.produtoId} className="text-cofre-suave">{i.motivo}</p>
          ))}
        </div>
      )}

      <details className="rounded-xl border border-cofre-borda bg-cofre-placa p-4">
        <summary className="cursor-pointer text-sm text-cofre-suave">
          Ver os {todos.length} produtos cotados
        </summary>
        <ul className="mt-3 space-y-2 text-sm">
          {todos.map((p) => (
            <li key={p.produtoId} className="flex justify-between gap-4 border-t border-cofre-borda/60 pt-2">
              <span className="text-cofre-suave">{p.seguradora} — {p.nome}</span>
              <span className="whitespace-nowrap font-medium">{p.aporteAnual}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

function Linha({ titulo, valores }: { titulo: string; valores: string[] }) {
  return (
    <tr>
      <th scope="row" className="px-4 py-3 text-left font-normal text-cofre-suave">
        {titulo}
      </th>
      {valores.map((valor, indice) => (
        <td key={indice} className={`px-4 py-3 ${indice === 0 ? 'font-semibold' : ''}`}>
          {valor}
        </td>
      ))}
    </tr>
  )
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add app/componentes/ValorAnimado.tsx app/componentes/Resultado.tsx
git commit -m "feat(ui): resultado com ranking, tabela e valores animados"
```

---

### Task 6: Montar a página

**Files:**
- Modify: `app/page.tsx`
- Create: `app/componentes/Painel.tsx`

- [ ] **Step 1: Criar o painel cliente**

`app/page.tsx` é Server Component e não pode ter estado. O estado fica num componente cliente.

Criar `app/componentes/Painel.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { FormularioCotacao } from './FormularioCotacao'
import { Resultado } from './Resultado'
import type { Resultado as TipoResultado } from '@/app/acoes'

export function Painel() {
  const [resultado, setResultado] = useState<TipoResultado | null>(null)
  const [nome, setNome] = useState('')

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <FormularioCotacao
          aoResultado={(r, n) => {
            setResultado(r)
            setNome(n)
          }}
        />
      </motion.div>

      <div>
        {resultado ? (
          <Resultado resultado={resultado} nome={nome} />
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl
                          border border-dashed border-cofre-borda p-8 text-center">
            <p className="max-w-xs text-sm text-cofre-suave">
              Preencha os dados do cliente para comparar as seguradoras.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Substituir `app/page.tsx`**

```tsx
import { Cabecalho } from './componentes/Cabecalho'
import { Painel } from './componentes/Painel'

export default function Pagina() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="mb-6 text-xl font-semibold">Análise Whole Life 10 anos</h1>
        <Painel />
      </main>
    </>
  )
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit && npm run build`
Expected: build conclui sem erro.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/componentes/Painel.tsx
git commit -m "feat(ui): monta a pagina principal"
```

---

### Task 7: Garantir que as tabelas não vazam

**Files:**
- Create: `tests/bundle.test.ts`

- [ ] **Step 1: Escrever o teste**

Criar `tests/bundle.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function arquivos(raiz: string, extensoes: string[]): string[] {
  const encontrados: string[] = []
  function percorrer(caminho: string) {
    for (const entrada of readdirSync(caminho)) {
      const completo = join(caminho, entrada)
      if (statSync(completo).isDirectory()) percorrer(completo)
      else if (extensoes.some((e) => completo.endsWith(e))) encontrados.push(completo)
    }
  }
  percorrer(raiz)
  return encontrados
}

describe('as tabelas de tarifa ficam no servidor', () => {
  it('nenhum componente cliente importa o repositorio ou o motor', () => {
    // As tarifas sao o ativo do negocio: 722 precos extraidos de 785 estudos.
    // Um import destes num arquivo 'use client' embute os ~300 KB de
    // dados/tarifas.json no bundle, e qualquer visitante baixa a base inteira.
    const clientes = arquivos('app', ['.tsx', '.ts']).filter((arquivo) =>
      readFileSync(arquivo, 'utf8').includes("'use client'"),
    )

    const vazando = clientes.filter((arquivo) => {
      const conteudo = readFileSync(arquivo, 'utf8')
      return (
        /from ['"]@\/lib\/repositorio/.test(conteudo) ||
        /from ['"]@\/lib\/motor/.test(conteudo) ||
        /from ['"]@\/dados/.test(conteudo)
      )
    })

    expect(vazando).toEqual([])
  })

  it('a acao de cotacao esta marcada como codigo de servidor', () => {
    const conteudo = readFileSync('app/acoes.ts', 'utf8')
    expect(conteudo.startsWith("'use server'")).toBe(true)
  })

  it('ha componentes cliente sendo verificados', () => {
    // Se a lista ficar vazia, o teste acima passa sem provar nada.
    const clientes = arquivos('app', ['.tsx', '.ts']).filter((arquivo) =>
      readFileSync(arquivo, 'utf8').includes("'use client'"),
    )
    expect(clientes.length).toBeGreaterThanOrEqual(4)
  })
})
```

- [ ] **Step 2: Rodar**

Run: `npm run test -- tests/bundle.test.ts`
Expected: PASS, 3 testes.

Se o primeiro teste falhar, **não relaxe a regra** — mova o import para a Server Action.

- [ ] **Step 3: Confirmar empiricamente que os dados não estão no bundle**

```bash
npm run build
grep -rl "taxaAnualPor1mm" .next/static/ 2>/dev/null || echo "OK: tarifas fora do bundle do cliente"
```

Esperado: a mensagem `OK: tarifas fora do bundle do cliente`.

- [ ] **Step 4: Rodar a suíte inteira**

Run: `npm run test`
Expected: PASS. Reporte o total (era 85 antes desta fase).

- [ ] **Step 5: Commit**

```bash
git add tests/bundle.test.ts
git commit -m "test(ui): garante que as tarifas nao chegam ao navegador"
```

---

### Task 8: Verificação visual

**Files:** nenhum

- [ ] **Step 1: Subir a aplicação**

```bash
npm run dev
```

- [ ] **Step 2: Conferir no navegador**

Entrar com a senha de `.env.local` e verificar, anotando o que encontrar:

1. O cabeçalho mostra a logo RT em branco sobre o fundo escuro, com a textura discreta
2. Preencher: nome qualquer, nascimento `1976-01-01`, masculino, capital `1.000.000,00`
3. Ao enviar, o botão mostra o anel girando e depois os quatro cartões entram em cascata
4. A MAG aparece em 1º com halo ciano, valor `R$ 57.248,94`
5. Os valores contam até o número final
6. A tabela mostra break-even real `10º ano` nas quatro
7. Trocar o nascimento para `1964-01-01` (62 anos): o aviso do corretor aparece dizendo que o resgate não alcança o aportado, e a linha de break-even real mostra "não atinge" em algumas
8. Trocar para `1947-01-01` (79 anos): aparece a mensagem sobre o teto de R$ 700 mil da MAG Sucessão
9. Reduzir a janela para largura de celular: a tabela rola horizontalmente e nada estoura a tela

- [ ] **Step 3: Verificar movimento reduzido**

No DevTools, Rendering → `prefers-reduced-motion: reduce`. Recarregar e cotar de novo: os valores devem aparecer prontos, sem contagem.

- [ ] **Step 4: Reportar**

Anotar qualquer divergência entre o esperado e o observado. Não corrigir sem reportar antes.

---

## Verificação final da fase

- [ ] `npm run test` passa inteiro
- [ ] `npx tsc --noEmit` sem erros
- [ ] `npm run build` conclui
- [ ] `grep "taxaAnualPor1mm" .next/static/` não encontra nada
- [ ] A tela cota, mostra o ranking e os avisos
- [ ] `prefers-reduced-motion` desliga as animações

## Fora do escopo desta fase

Geração do PDF e deploy na Vercel — próxima e última fase.
