'use client'

import { useState, useTransition } from 'react'
import { motion } from 'motion/react'
import { cotarComparativo, type Resultado } from '@/app/acoes'
import { idadeEm } from '@/lib/dominio/regras'
import { moedaParaNumero, numeroParaMascara } from '@/lib/formato'
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
      // O campo guarda so digitos; a mesma conversao usada na exibicao vira
      // o decimal que a Server Action espera.
      const valor = moedaParaNumero(numeroParaMascara(capital))
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
          <label htmlFor="nome" className={rotulo}>
            Nome completo
          </label>
          <input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={campo}
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="nascimento" className={rotulo}>
            Data de nascimento
          </label>
          <input
            id="nascimento"
            type="date"
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
            className={campo}
          />
          {idade !== null && (
            <p className="mt-1 text-xs text-cofre-suave">
              {idadeValida ? `${idade} anos` : 'Data inválida'}
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
          <label htmlFor="estadoCivil" className={rotulo}>
            Estado civil
          </label>
          <select
            id="estadoCivil"
            value={estadoCivil}
            onChange={(e) => setEstadoCivil(e.target.value)}
            className={campo}
          >
            {ESTADOS_CIVIS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </div>

        {(estadoCivil === 'Casado(a)' || estadoCivil === 'União estável') && (
          <div>
            <label htmlFor="regime" className={rotulo}>
              Regime de bens
            </label>
            <select
              id="regime"
              value={regimeBens}
              onChange={(e) => setRegimeBens(e.target.value)}
              className={campo}
            >
              {REGIMES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="profissao" className={rotulo}>
            Profissão
          </label>
          <input
            id="profissao"
            value={profissao}
            onChange={(e) => setProfissao(e.target.value)}
            className={campo}
            autoComplete="off"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="capital" className={rotulo}>
            Capital segurado
          </label>
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
