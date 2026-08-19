'use client'

import { useState, useTransition } from 'react'
import { motion } from 'motion/react'
import { cotarComparativo, type Resultado } from '@/app/acoes'
import { idadeEm } from '@/lib/dominio/regras'
import {
  moedaParaNumero,
  numeroParaMascara,
  mascaraData,
  dataBrasileiraParaDate,
} from '@/lib/formato'
import { CampoMoeda } from './CampoMoeda'
import type { DadosFormulario, Sexo } from '@/lib/dominio/tipos'

const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)']
const REGIMES = [
  'Comunhão parcial de bens',
  'Comunhão universal de bens',
  'Separação total de bens',
  'Participação final nos aquestos',
]

const ATALHOS_CAPITAL = [
  { rotulo: '500 mil', valor: '50000000' },
  { rotulo: '1 milhão', valor: '100000000' },
  { rotulo: '2 milhões', valor: '200000000' },
  { rotulo: '5 milhões', valor: '500000000' },
]

const rotulo = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-cofre-suave'
const campo =
  'w-full rounded-md border border-cofre-borda bg-[#061224] px-3.5 py-2.5 text-sm text-cofre-texto ' +
  'placeholder:text-cofre-suave/40 shadow-inner outline-none transition-all duration-150 ' +
  'focus:border-cofre-acento focus:ring-1 focus:ring-cofre-acento/40'

interface Props {
  aoResultado: (resultado: Resultado | null, dados: DadosFormulario | null) => void
}

export function FormularioCotacao({ aoResultado }: Props) {
  const [nome, setNome] = useState('')
  const [sexo, setSexo] = useState<Sexo>('M')
  const [dataTexto, setDataTexto] = useState('')
  const [estadoCivil, setEstadoCivil] = useState(ESTADOS_CIVIS[0])
  const [regimeBens, setRegimeBens] = useState(REGIMES[0])
  const [profissao, setProfissao] = useState('')
  const [capital, setCapital] = useState('100000000') // R$ 1.000.000,00
  const [processando, iniciarTransicao] = useTransition()

  // Converte a data digitada DD/MM/AAAA para objeto Date
  const dataNascimento = dataBrasileiraParaDate(dataTexto)
  const idade = dataNascimento ? idadeEm(dataNascimento, new Date()) : null
  const idadeValida = idade !== null && idade >= 0 && idade <= 120
  const podeEnviar = nome.trim().length > 0 && idadeValida && capital.length > 0

  function aoMudarData(e: React.ChangeEvent<HTMLInputElement>) {
    setDataTexto(mascaraData(e.target.value))
  }

  function limparFormulario() {
    setNome('')
    setDataTexto('')
    setProfissao('')
    setCapital('100000000')
    aoResultado(null, null)
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!podeEnviar || idade === null) return

    iniciarTransicao(async () => {
      const valor = moedaParaNumero(numeroParaMascara(capital))
      const dados: DadosFormulario = {
        nome: nome.trim(),
        sexo,
        idade,
        capital: valor,
        estadoCivil,
        // O regime so descreve a situacao de quem e casado ou tem uniao estavel.
        regimeBens: estadoCivil === 'Casado(a)' || estadoCivil === 'União estável' ? regimeBens : null,
        profissao: profissao.trim(),
      }
      aoResultado(await cotarComparativo({ sexo, idade, capital: valor }), dados)
    })
  }

  return (
    <form
      onSubmit={enviar}
      className="relative overflow-hidden rounded-xl border border-cofre-borda bg-gradient-to-b from-cofre-placa to-[#08152B] p-6 shadow-2xl"
    >
      <div className="mb-5 flex items-center justify-between border-b border-cofre-borda/60 pb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-cofre-acento">
          Dados do cliente
        </h2>
        <button
          type="button"
          onClick={limparFormulario}
          className="text-xs text-cofre-suave hover:text-cofre-acento transition-colors"
        >
          Limpar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="nome" className={rotulo}>
            Nome completo
          </label>
          <input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Roberto Silva"
            className={campo}
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="nascimento" className={rotulo}>
            Data de nascimento
          </label>
          <div className="relative">
            <input
              id="nascimento"
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={dataTexto}
              onChange={aoMudarData}
              placeholder="DD/MM/AAAA"
              className={campo}
            />
            {dataTexto.length === 10 && idadeValida && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cofre-sucesso">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
          </div>
          {dataTexto.length > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-cofre-suave">
              {dataTexto.length === 10 ? (
                idadeValida ? (
                  <span className="inline-flex items-center rounded bg-cofre-acento/15 px-2 py-0.5 text-xs font-semibold text-cofre-acento">
                    {idade} anos calculados
                  </span>
                ) : (
                  <span className="text-cofre-perigo">Data inválida</span>
                )
              ) : (
                <span className="text-cofre-suave/70">Digite dia, mês e ano</span>
              )}
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
                className={`flex-1 rounded-md border py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                  sexo === opcao
                    ? 'border-cofre-acento bg-cofre-acento/15 text-cofre-acento shadow-sm'
                    : 'border-cofre-borda bg-[#061224] text-cofre-suave hover:border-cofre-borda/80 hover:text-cofre-texto'
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
              <option key={e} value={e} className="bg-cofre-placa text-cofre-texto">
                {e}
              </option>
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
                <option key={r} value={r} className="bg-cofre-placa text-cofre-texto">
                  {r}
                </option>
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
            placeholder="Ex: Empresário"
            className={campo}
            autoComplete="off"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="capital" className={rotulo}>
            Capital segurado
          </label>
          <CampoMoeda id="capital" valor={capital} aoMudar={setCapital} />

          {/* Atalhos rápidos de capital */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-cofre-suave/80 mr-1">Atalhos:</span>
            {ATALHOS_CAPITAL.map((atalho) => (
              <button
                key={atalho.valor}
                type="button"
                onClick={() => setCapital(atalho.valor)}
                className={`rounded border px-2 py-1 text-xs transition-all ${
                  capital === atalho.valor
                    ? 'border-cofre-acento bg-cofre-acento/15 font-semibold text-cofre-acento'
                    : 'border-cofre-borda bg-[#061224] text-cofre-suave hover:border-cofre-borda/80 hover:text-cofre-texto'
                }`}
              >
                {atalho.rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      <motion.button
        type="submit"
        disabled={!podeEnviar || processando}
        whileTap={{ scale: 0.985 }}
        className="relative mt-6 w-full overflow-hidden rounded-md bg-gradient-to-r from-cofre-acento to-cofre-acento-hover py-3.5
                   text-sm font-bold uppercase tracking-wider text-[#061224] shadow-lg transition-all
                   hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-35"
      >
        {processando && (
          <motion.span
            aria-hidden
            className="absolute inset-0 border-2 border-[#061224]/30 border-t-[#061224]"
            style={{ borderRadius: 6 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        )}
        <span className="relative">
          {processando ? 'Calculando comparativo...' : 'Gerar comparativo'}
        </span>
      </motion.button>
    </form>
  )
}
