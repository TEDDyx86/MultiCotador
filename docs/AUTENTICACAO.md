# Autenticação e feedback

O acesso deixou de ser uma senha única compartilhada e passou a ser uma conta por
pessoa, no Supabase. Quem entra fica identificado, e é isso que permite atribuir
cada feedback a alguém.

---

## O que só você pode fazer

Estes três passos dependem da sua conta no Supabase. Enquanto não forem feitos,
**o sistema devolve 503 em todas as rotas** — o proxy falha fechado de
propósito, para não haver a possibilidade de subir sem proteção nenhuma.

### 1. Criar o projeto e copiar as chaves

No painel do Supabase, em **Project Settings → API**, copie os três valores para
o seu `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

As duas primeiras são públicas por natureza e vão para o navegador. A terceira
**ignora todas as regras de segurança do banco** e só é usada pelos scripts de
linha de comando — nunca deve ganhar o prefixo `NEXT_PUBLIC_`. Há um teste que
falha se isso acontecer (`tests/segredos.test.ts`).

O `.env.local` de hoje ainda tem `APP_SENHA_HASH` e `APP_SESSAO_SEGREDO`, da
autenticação anterior. Pode apagar as duas.

A qualquer momento, para saber o que ainda falta:

```bash
npm run supabase:verificar
```

Ele confere as chaves, a conexão, as contas, a tabela, a coluna de anexos e o
bucket — e diz qual arquivo rodar para cada pendência. Cada uma dessas peças
falha num momento diferente e nenhuma falha no build: a chave ausente derruba
tudo com 503, a tabela ausente só aparece quando alguém envia feedback, e o
bucket ausente só quando alguém anexa arquivo.

### 2. Criar a tabela de feedbacks

No painel, em **SQL Editor → New Query**, cole e execute o conteúdo de
[`supabase-feedbacks.sql`](./supabase-feedbacks.sql).

Ele cria a tabela, o índice e as regras de acesso. As regras são estas:

- quem está autenticado **insere** feedback, e só em nome de si mesmo — o banco
  recusa um registro com dono diferente de quem enviou;
- **ninguém lê pelo aplicativo**, nem os próprios feedbacks. Leitura só pela
  chave de serviço, ou seja, pelo painel do Supabase ou pelo script da seção
  seguinte.

A segunda regra é deliberada: sem ela, o canal de feedback viraria uma forma de
um avaliador ler o que os outros escreveram.

### 3. Habilitar os anexos

Execute também [`supabase-anexos.sql`](./supabase-anexos.sql). Ele acrescenta a
coluna `anexos` à tabela e cria o bucket **privado** `feedback-anexos`.

As regras dos arquivos espelham as da tabela: o primeiro nível do caminho é o id
de quem enviou, e a política compara esse nível com `auth.uid()` — é o que
impede alguém de gravar na pasta de outra pessoa. Ninguém lê pelo aplicativo,
nem o próprio anexo; a leitura sai por link assinado gerado com a chave de
serviço.

O bucket é privado de propósito: uma captura de tela do sistema pode conter dado
de cliente, e num bucket público qualquer pessoa com o link a abriria.

São aceitos PNG, JPEG, WEBP e PDF — até 3 arquivos, 4 MB cada e 8 MB no total.
O formato é decidido pelos **primeiros bytes do arquivo**, não pelo tipo que o
navegador declara: esse campo é escolhido por quem envia, e um executável
renomeado para `.png` chega anunciando `image/png`.

### 4. Cadastrar os avaliadores

```bash
# uma pessoa, com senha gerada pelo script
npm run usuario:criar -- ana@blue3.com.br

# uma pessoa, com senha escolhida por você
npm run usuario:criar -- ana@blue3.com.br=SenhaDela123

# a turma toda de uma vez
npm run usuario:criar -- ana@blue3.com.br bruno@blue3.com.br carlos@blue3.com.br
```

A senha gerada aparece **uma única vez**, na saída do comando — é essa que vai
para a pessoa. As contas já nascem confirmadas, então o acesso é imediato e
ninguém precisa clicar em link de e-mail.

Se algum e-mail da lista estiver errado, **nada é cadastrado**: o script valida
tudo antes de chamar o Supabase. Com dez e-mails e um errado no meio, cadastrar
os cinco primeiros e parar deixaria a turma pela metade, sem um estado claro
para retomar.

---

## Ler o que foi registrado

```bash
npm run feedback:listar                  # os 50 mais recentes
npm run feedback:listar -- --tipo bug    # só os erros relatados
npm run feedback:listar -- --limite 200
```

A saída começa com a contagem por tipo — com trinta registros, a primeira coisa
que interessa é se são trinta erros ou trinta sugestões.

---

## Como funciona, do lado do código

| Arquivo | Papel |
|---|---|
| `proxy.ts` | Barra toda rota sem sessão válida. Valida o token contra o Supabase a cada requisição, em vez de confiar no cookie. |
| `lib/supabase/servidor.ts` | Cliente usado pelas rotas e páginas. `obterUsuarioAtual()` é a fonte de verdade sobre quem está logado. |
| `lib/supabase/admin.ts` | Cliente com a chave de serviço. Recusa-se a rodar no navegador. Só para os scripts. |
| `lib/auth/validacao.ts` | Sanitiza e-mail e senha. Erro de login é sempre a mesma frase, para não revelar quais e-mails existem. |
| `lib/auth/limite.ts` | Limite de tentativas por IP na rota de login. |
| `lib/feedback/validacao.ts` | Limites de tipo e tamanho da mensagem, espelhando as restrições da tabela. |
| `app/api/feedback/route.ts` | Grava o feedback pelo cliente do próprio usuário, para as regras do banco continuarem valendo. |
| `app/componentes/BotaoFeedback.tsx` | O acionador, no cabeçalho. |

O botão de feedback fica no cabeçalho, e não no painel de resultado, porque a
tela foi calibrada para caber em 900px sem rolagem — qualquer bloco novo ali
devolveria a rolagem.

---

## Restos da autenticação anterior

Estes arquivos não são mais usados por nada em produção, mas continuam no
repositório com seus testes passando:

- `lib/auth/senha.ts` — hash scrypt da senha única
- `lib/auth/sessao.ts` — cookie assinado por HMAC
- `scripts/gerar-hash.ts` — gerava o hash daquela senha
- `tests/auth.test.ts` e parte de `tests/config.test.ts`

`COOKIE_SESSAO` continua sendo usado em um único lugar, de propósito: a rota de
logout apaga o cookie antigo, para quem ainda o tiver no navegador não ficar
carregando um cookie órfão.

Vale decidir se apaga o resto ou se guarda como plano B. Enquanto estiver aí, os
testes seguem verdes — eles apenas testam código que ninguém chama.
