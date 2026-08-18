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

/** Zera o historico de um IP. Chamado apos login bem-sucedido. */
export function limparIp(ip: string): void {
  tentativas.delete(ip)
}

/** Limpa o estado. Existe para os testes; nao usar em producao. */
export function limparTentativas(): void {
  tentativas.clear()
}
