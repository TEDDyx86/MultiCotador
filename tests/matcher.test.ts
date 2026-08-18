import { describe, it, expect } from 'vitest'
import { PADRAO_ROTAS_PROTEGIDAS, config } from '@/proxy'

/**
 * O matcher do proxy e a unica coisa que decide qual rota passa pela
 * autenticacao. Ele ja teve um furo: a versao anterior excluia por prefixo
 * (`login`), nao por rota, entao /login-antigo e /loginx/segredo ficavam
 * liberados. Um furo que apareceu uma vez merece teste, nao conferencia.
 */
const REGEX_ROTAS_PROTEGIDAS = new RegExp(`^${PADRAO_ROTAS_PROTEGIDAS}$`)

function protegido(caminho: string): boolean {
  return REGEX_ROTAS_PROTEGIDAS.test(caminho)
}

describe('matcher das rotas protegidas', () => {
  it('a constante exportada e o matcher do config nao divergem', () => {
    // O Next exige literal estatica em config.matcher, entao a string aparece
    // duas vezes no arquivo. Este teste impede que uma mude sem a outra.
    expect(config.matcher).toEqual([PADRAO_ROTAS_PROTEGIDAS])
  })

  it.each([
    ['/', true],
    ['/login', false],
    ['/api/login', false],
    ['/api/logout', true],
    ['/api/comparativo', true],
    ['/login-antigo', true],
    ['/loginx/segredo', true],
    ['/_next/static/chunk.js', false],
    ['/favicon.ico', false],
  ])('%s -> protegido=%s', (caminho, esperado) => {
    expect(protegido(caminho)).toBe(esperado)
  })

  it('protege as rotas de aplicacao', () => {
    expect(protegido('/comparativo')).toBe(true)
    expect(protegido('/api/comparativo/gerar')).toBe(true)
    expect(protegido('/relatorio/2026')).toBe(true)
  })

  it('libera o que esta abaixo de /login, e so isso', () => {
    // A tela de login pode ter sub-rotas proprias; nomes que apenas comecam
    // com "login" sao outra coisa e continuam protegidos.
    expect(protegido('/login/recuperar')).toBe(false)
    expect(protegido('/login-admin')).toBe(true)
    expect(protegido('/logins')).toBe(true)
  })

  it('nao libera nada alem de /api/login dentro de /api', () => {
    expect(protegido('/api/login/qualquer')).toBe(true)
    expect(protegido('/api/loginx')).toBe(true)
  })

  it('libera apenas os estaticos do framework', () => {
    expect(protegido('/_next/image?url=x')).toBe(false)
    expect(protegido('/_next/webpack-hmr')).toBe(true)
    expect(protegido('/favicon-x.ico')).toBe(true)
  })

  it('libera as imagens de marca', () => {
    // Ja quebrou uma vez: com /marcas/ protegido, a logo do cabecalho e a
    // textura de fundo vinham como redirecionamento no lugar do arquivo, e a
    // tela abria com imagem quebrada. Sao imagens publicas por natureza; o
    // que precisa ficar trancado sao as tarifas, que nunca saem do servidor.
    expect(protegido('/marcas/rt-horizontal-branca.png')).toBe(false)
    expect(protegido('/marcas/mag.png')).toBe(false)
    expect(protegido('/marcas/textura-cabecalho.png')).toBe(false)
  })

  it('nao libera nomes que apenas comecam com marcas', () => {
    expect(protegido('/marcas-internas/tabela.json')).toBe(true)
    expect(protegido('/marcasx')).toBe(true)
  })
})
