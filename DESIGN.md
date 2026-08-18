---
name: Multicotador RT
description: Sistema executivo de simulação e comparativo de seguros Whole Life
colors:
  primary: "#D4A24E"
  primary-hover: "#E5B869"
  primary-deep: "#A8742A"
  canvas-bg: "#061224"
  plate-bg: "#0E2246"
  plate-card: "#122A54"
  border-subtle: "#1C3A69"
  border-gold: "#C6923C"
  text-main: "#F4F7FC"
  text-muted: "#9EB3CD"
  text-gold: "#E5B869"
  alert-amber: "#E69526"
  alert-red: "#E05353"
  success-green: "#2ECC71"
typography:
  display:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas-bg}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System: Multicotador RT

## Overview

**Creative North Star: "The Private Wealth Vault"**

O Multicotador RT une a sobriedade e segurança de uma sala de Family Office com a clareza e velocidade de uma mesa de operações. Desenhado especificamente para permitir que o planejador patrimonial opere com agilidade e apresente o resultado diretamente ao cliente durante reuniões de decisão.

A identidade visual abandona tons cianos genéricos de tecnologia e abraça as cores do monograma RT: **Azul Marinho Nobre Profundo** e **Ouro Champagne / Âmbar**, conferindo distinção, solidez institucional e prestígio.

**Key Characteristics:**
- Fundo noturno profundo e sofisticado com atmosfera de cofre de alta segurança.
- Acentos metálicos em Ouro Champagne reservado para pontos de decisão, destaques de valor e liderança de ranking.
- Tipografia precisa, legibilidade financeira impecável e dados densos sem sobrecarga cognitiva.
- Superfícies em camadas com bordas sutis e iluminação refinada.

## Colors

Paleta nobre inspirada no padrão geométrico do monograma RT (`marcas/textura-cabecalho.png`).

### Primary
- **Champagne Gold** (`#D4A24E` / `#E5B869`): Cor primária de ação, valor preservado, destaques do 1º lugar do ranking e foco interativo.

### Neutral
- **Midnight Canvas** (`#061224`): Fundo geral da aplicação, transmitindo profundidade e foco.
- **Deep Vault Plate** (`#0E2246`): Superfície das placas, formulários e painéis de controle.
- **Card Plate Light** (`#122A54`): Fundo de cards, cabeçalhos de tabela e detalhes elevados.
- **Vault Border** (`#1C3A69`): Delimitação de cartões e inputs.
- **Text Main** (`#F4F7FC`): Branco puro/gelo para títulos, valores monetários e texto em destaque.
- **Text Muted** (`#9EB3CD`): Azul aço acetinado de alto contraste (≥ 4.5:1) para rótulos secundários e metadados.

### Semantic
- **Alert Amber** (`#E69526`): Avisos técnicos ao corretor e break-even não atingido.
- **Success Green** (`#2ECC71`): Indicadores positivos de cobertura.

### Named Rules
**The Rarity of Gold Rule.** O ouro champagne é reservado exclusivamente para valores-chave, ações primárias e a seguradora vencedora. Nunca é usado como preenchimento arbitrário ou ruído decorativo.

## Typography

**Body & Display:** Geist Sans / System Sans

### Hierarchy
- **Display** (600, 1.75rem – 2.25rem, -0.02em): Títulos executivos e valor preservado.
- **Headline** (600, 1.125rem – 1.25rem): Títulos de seções (Dados do cliente, Ranking).
- **Title** (600, 1rem): Nomes de seguradoras, valores de aporte e destaques.
- **Body** (400, 0.875rem): Parágrafos informativos, linhas de tabela e explicações.
- **Label** (500, 0.75rem, uppercase, tracking +0.08em): Rótulos de campos e cabeçalhos de tabela.

## Layout

- Grid responsivo de duas colunas em desktop: Formulário de entrada compacto e fixado à esquerda (380px), Painel de Resultados amplo à direita.
- Em dispositivos móveis ou telas estreitas, a experiência se reorganiza fluidamente em coluna única.

## Elevation & Depth

- Camadas tonais construídas do fundo mais escuro (`#061224`) para placas elevadas (`#0E2246` e `#122A54`).
- Borda sutil com brilho dourado (`border-primary/40` e `shadow-[0_4px_24px_rgba(212,162,78,0.15)]`) no card líder do ranking e no painel de Valor Preservado.

## Shapes

- Cantos refinados com raio de 10px a 14px nos cartões principais e 6px nos botões e inputs.
- Inputs com leve sombra interna e borda dourada ativa ao foco.

## Components

### Botão Primário
- Fundo em Ouro Champagne (`#D4A24E` hover `#E5B869`), texto escuro profundo (`#061224`), peso semi-bold, microinteração de clique e anel giratório em execução.

### Card de Ranking
- Card da seguradora recomendada (1º lugar) destacado com moldura dourada e halo sutil, distinguindo-se claramente dos demais competidores.
- Logos oficiais de seguradoras montadas sobre fundo branco translúcido (`bg-white/95`) para preservar a fidelidade das marcas.

### Painel de Valor Preservado
- Gradiente metálico discreto com tipografia ouro de grande porte e contagem animada.

## Do's and Don'ts

### Do:
- **Do** manter alto contraste em todos os textos financeiros e células da tabela.
- **Do** preservar a integridade das marcas das seguradoras parceiras.
- **Do** exibir sempre a idade calculada instantaneamente ao preencher a data de nascimento.

### Don't:
- **Don't** usar azuis cianos saturados ou tons infantis que quebrem a atmosfera de private banking.
- **Don't** ocultar informações técnicas de break-even real ou tarifas estimadas do corretor.
