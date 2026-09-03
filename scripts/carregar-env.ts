import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Le o .env.local para dentro de process.env.
 *
 * Os scripts administrativos rodam por `tsx`, fora do Next, que e quem
 * normalmente carrega esse arquivo. Sem isto o script encontra
 * SUPABASE_SERVICE_ROLE_KEY vazia e falha dizendo que falta configurar — o que
 * e confuso quando a variavel esta ali, a dois palmos, no .env.local.
 *
 * O ambiente tem precedencia sobre o arquivo: quem exporta a variavel na mao
 * quer justamente sobrepor o que esta gravado.
 */
export function carregarEnvLocal(): void {
  const caminho = resolve(process.cwd(), '.env.local')
  if (!existsSync(caminho)) return

  for (const linha of readFileSync(caminho, 'utf8').split('\n')) {
    const par = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/)
    if (!par) continue

    const chave = par[1]
    let valor = (par[2] ?? '').trim()
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1)
    }

    if (!process.env[chave]) process.env[chave] = valor
  }
}
