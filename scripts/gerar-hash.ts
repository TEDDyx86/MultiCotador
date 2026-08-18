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
