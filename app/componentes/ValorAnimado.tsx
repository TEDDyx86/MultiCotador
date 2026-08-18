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
  const [exibido, setExibido] = useState(texto)
  const quadro = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (reduzirMovimento) {
      setExibido(texto)
      return
    }

    const digitos = texto.replace(/\D/g, '')
    const alvo = Number(digitos)
    if (!Number.isFinite(alvo) || alvo === 0) {
      setExibido(texto)
      return
    }

    const inicio = performance.now()

    function passo(agora: number) {
      const progresso = Math.min((agora - inicio) / duracao, 1)
      // Desaceleracao cubica: rapido no comeco, assenta no fim
      const suave = 1 - Math.pow(1 - progresso, 3)
      const parcial = Math.round(alvo * suave)
        .toString()
        .padStart(digitos.length, '0')

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

  return <span className="tabular-nums">{exibido}</span>
}
