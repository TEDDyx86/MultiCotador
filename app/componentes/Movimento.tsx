'use client'

import { MotionConfig } from 'motion/react'

/**
 * Respeita a preferencia de movimento reduzido do sistema em toda a interface.
 *
 * `reducedMotion="user"` faz o Motion desligar transformacoes de posicao e
 * escala quando o sistema pede menos movimento, preservando as transicoes de
 * opacidade — o estado ainda muda de forma perceptivel, o que uma supressao
 * total de animacao destruiria.
 *
 * Antes disso, so o contador de valores consultava a preferencia; o formulario,
 * o painel e o resultado animavam de qualquer jeito. Aplicar no topo evita que
 * cada componente novo precise lembrar de checar.
 */
export function Movimento({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
