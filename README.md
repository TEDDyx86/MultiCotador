# Multicotador RT — Seguros Whole Life

Sistema executivo de simulação e comparativo de apólices de seguro de vida resgatável (**Whole Life com aporte de 10 anos e vigência vitalícia**), desenvolvido para consultores de planejamento patrimonial e sucessório da **Robson Tavernard (Blue3 / XP)**.

O sistema substitui a coleta manual em múltiplos portais e planilhas por um motor de cálculo determinístico e instantâneo, auditado centavo a centavo e com interface executiva pronta para reuniões com clientes de alta renda (*Family Offices / Private Banking*).

---

## 🏛️ Seguradoras e Produtos Cobertos

O multicotador calcula e compara as 4 seguradoras líderes com valor de resgate e inclui produtos sucessórios puros:

* **MAG Seguros**: Vida Toda Integral 10 e MAG Sucessão (sem resgate)
* **Icatu Seguros**: Vitalício 10
* **MetLife**: Vida Total 10 e MetLife Legado (sem resgate)
* **Prudential**: Vida Inteira 10

---

## 🏗️ Arquitetura do Sistema

O projeto foi concebido seguindo princípios de arquitetura limpa (*Clean Architecture*), onde as regras de negócio e os cálculos não dependem de banco de dados ou frameworks de interface:

```
app/
├── (paginas e rotas)
│   ├── page.tsx               # Tela principal (Formulário + Painel de Resultados)
│   ├── login/page.tsx         # Tela de autenticação restrita
│   └── api/login/route.ts     # Autenticação segura via scrypt e cookie HMAC
├── componentes/               # Componentes visuais (Formulário, Ranking, Tabela, Cabeçalho)
└── acoes.ts                   # Server Actions para orquestração de cotação

lib/
├── dominio/                   # Entidades e regras de negócio puras (sem I/O)
│   ├── tipos.ts               # Tipos TypeScript formais
│   └── regras.ts              # Regras atuariais (idade exata, IOF, limites etários)
├── motor/                     # Núcleo de cálculo financeiro (porte TypeScript com Decimal.js)
│   ├── cotacao.ts             # Cálculo de prêmio anual, mensal e elegibilidade
│   └── comparativo.ts         # Ranking, break-even real e valor preservado
├── repositorio/               # Abstração de acesso a dados
│   └── repositorioJson.ts     # Implementação sobre dados versionados em JSON
└── auth/                      # Mecanismos de segurança (scrypt, HMAC, rate-limiting)

dados/                         # Tabelas versionadas no repositório
├── tarifas.json               # 722 tarifas oficiais auditadas
├── resgates.json              # 484 linhas de projeção de resgate e break-even
└── produtos.json              # Metadados oficiais dos 6 produtos
```

### Regras de Dependência:
* `dominio` não depende de nada externo.
* `motor` depende apenas de `dominio` e de aritmética precisa com `Decimal.js`.
* `app` consome `motor` e `repositorio` através de Server Actions seguras, garantindo que as tarifas brutas nunca sejam expostas ao cliente no navegador.

---

## 🎨 Identidade Visual (The Private Wealth Vault)

* **Paleta Nobre**: Inspirada no monograma geométrico RT (`marcas/textura-cabecalho.png`), combinando **Azul Marinho Nobre** (`#050E1D` / `#0B1B38`) e **Ouro Champagne** (`#D4A24E` / `#E5B869`).
* **Iluminação de Estúdio**: Efeitos de luz focal superior e backlights suaves que conferem tridimensionalidade e prestígio ao comparativo.
* **Entrada de Dados Fluida**: Máscara inteligente `DD/MM/AAAA` com cálculo instantâneo de idade e atalhos rápidos de capital (`500k`, `1M`, `2M`, `5M`).

---

## 🔒 Segurança e Autenticação

A aplicação possui barreira de segurança em todas as rotas protegidas pelo middleware (`proxy.ts`):

1. **Senha Hash (scrypt)**: O segredo nunca fica em texto puro; a validação utiliza tempo constante (`timingSafeEqual`) para evitar ataques de temporização.
2. **Sessão Assinada**: Cookie criptografado com HMAC-SHA256 (`httpOnly`, `secure`, `sameSite=strict`).
3. **Proteção contra Força Bruta**: Rate limiting por IP na rota de login.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
* Node.js 20+ instalado
* NPM ou PNPM

### 1. Clonar o repositório e instalar dependências
```bash
git clone https://github.com/TEDDyx86/MultiCotador.git
cd MultiCotador
npm install
```

### 2. Configurar variáveis de ambiente
Copie o arquivo de exemplo:
```bash
cp .env.example .env.local
```

Preencha as variáveis em `.env.local`:
* **`APP_SENHA_HASH`**: Gere sua senha criptografada com:
  ```bash
  npx tsx scripts/gerar-hash.ts <sua-senha-com-12+-caracteres>
  ```
* **`APP_SESSAO_SEGREDO`**: Gere a chave de assinatura com:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 3. Rodar em ambiente de desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

### 4. Executar a suíte de testes
O projeto conta com mais de 110 testes unitários automatizados cobrindo 719 casos de regressão atuarial:
```bash
npm test
```

---

## ☁️ Deploy na Vercel

1. Importe o repositório na **Vercel**.
2. Cadastre as duas variáveis em **Project Settings → Environment Variables**:
   * `APP_SENHA_HASH`
   * `APP_SESSAO_SEGREDO`
3. *(Atenção: Nenhuma das duas variáveis deve conter o prefixo `NEXT_PUBLIC_`)*.
4. O build e deploy serão realizados automaticamente.
