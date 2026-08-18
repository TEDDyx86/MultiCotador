# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Corretores e Assessores de Investimento / Planejadores Patrimoniais**: Equipe de Robson Tavernard (Blue3 / XP) realizando cotações rápidas e apresentações consultivas.
- **Clientes de Alta Renda (Público Secundário em Reunião)**: Visualizam a tela de resultados em tempo real durante reuniões de planejamento patrimonial e sucessório com o assessor.

## Product Purpose

Substituir o processo manual e lento de cotação de seguros de vida resgatáveis (Whole Life com aporte de 10 anos e vigência vitalícia), que antes exigia acessar 4 portais de seguradoras diferentes e consolidar dados manualmente em planilhas suscetíveis a erros de digitação. 

O sistema entrega:
1. Simulação comparativa instantânea e auditada centavo a centavo na tela, pronta para apresentação ao cliente.
2. Emissão sob demanda de um documento comparativo executivo em PDF de 1 página fiel ao modelo de entrega comercial.

## Positioning

Simulador interno de alta precisão com motor de cálculo determinístico e local (sem latência de rede externa), baseado em tarifas e curvas de resgate oficiais auditadas contra 719 casos de referência. Foco total em Whole Life 10 anos e transparência no cálculo de Break-even real e valor preservado.

## Operating Context

- **Ambiente**: Utilizado em computadores e notebooks em reuniões presenciais ou remotas (compartilhamento de tela com o cliente) e na rotina pré-reunião de corretores.
- **Fluxo Operacional**: O corretor preenche os dados do cliente (Nome, Sexo, Nascimento, Estado Civil, Regime de Bens, Profissão, Capital Segurado), obtém o comparativo instantâneo na tela e pode acionar a geração do PDF A4 executivo sob demanda.
- **Sessão & Dados**: Cotações são efêmeras/descartáveis (sem banco de dados de histórico no momento); o segredo e cálculo ficam protegidos no servidor.

## Capabilities and Constraints

- **Produtos Elegíveis**: 6 produtos Whole Life parametrizados (4 com valor de resgate para o comparativo geral: MAG Vida Toda Integral 10, Icatu Vitalício 10, MetLife Vida Total 10, Prudential Vida Inteira 10; e 2 sucessórios puros sem resgate: MAG Sucessão e MetLife Legado).
- **Parâmetros Fixos**: Aporte em 10 anos, vigência vitalícia, aplicação de IOF (0,38%).
- **Cálculo Local**: Motor TS operando com `Decimal.js` para garantir precisão exata de centavos.
- **Geração de PDF**: Exportação em lote de página única A4, acionada sob demanda após conferência dos resultados.
- **Autenticação**: Senha única protegida com hash scrypt, cookie assinado HMAC e rate limit por IP.

## Brand Commitments

- **Identidade da Marca**: Robson Tavernard (RT) — Planejamento Patrimonial e Sucessório, associado à Blue3 Investimentos e XP.
- **Ativos Visuais Vinculantes**:
  - Padrão geométrico monograma RT (`marcas/textura-cabecalho.png`).
  - Paleta de cores inspirada no monograma: Azul Marinho Nobre/Profundo (`#061224`, `#0B1B3D`) combinado com Ouro Champagne / Âmbar Nobre (`#C6923C`, `#D4A24E`, `#E5B869`).
  - Logos oficiais das seguradoras (MAG, Icatu, MetLife, Prudential) preservadas com legibilidade e contraste adequados.
- **Tom de Voz**: Executivo, confidencial, sólido, sofisticado, de alta segurança e precisão. A tela deve transmitir sofisticação de *Private Banking / Family Office* e não de SaaS genérico.

## Evidence on Hand

- `dados/tarifas.json`, `dados/resgates.json`, `dados/produtos.json`: Bases versionadas com tarifas e resgates.
- `Comparativo-WholeLife-JohnDaniel.pdf`: Referência visual e de cálculo oficial do documento de saída.
- `public/marcas/`: Logomarcas da RT, seguradoras e textura geométrica do monograma.
- `docs/superpowers/specs/2026-08-18-multicotador-design.md`: Especificação técnica e regras de negócio.

## Product Principles

1. **Apresentação Imediata ao Cliente**: A interface não é apenas um painel de operação do corretor; ela deve ter nível estético e clareza para ser mostrada diretamente ao cliente final durante reuniões de fechamento.
2. **Precisão Matemática Inegociável**: Todo número exibido deve refletir o cálculo real das seguradoras, com avisos claros quando houver particularidades (tarifas estimadas, limites etários ou break-even).
3. **Agilidade Executiva**: Zero atrito de entrada de dados, feedback instantâneo e exportação limpa de PDF sob demanda.
4. **Identidade Visual Marcante (Navy & Gold)**: Evitar interfaces frias ou monótonas em favor de uma estética sofisticada que dialogue com o padrão monograma RT e o universo de patrimônio e investimentos.

## Accessibility & Inclusion

- Contraste WCAG AA para textos financeiros e tabelas de dados.
- Suporte a navegação por teclado e semântica de formulário e tabelas (`<th scope="row/col">`, `<table role="table">`).
- Suporte a `prefers-reduced-motion` para animações financeiras.
