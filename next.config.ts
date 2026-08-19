import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * O Chromium do @sparticuz nao pode ser empacotado pelo bundler: ele resolve o
   * binario em tempo de execucao. Marcado como externo, o Next o mantem em
   * node_modules na funcao serverless.
   */
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],

  outputFileTracingIncludes: {
    /**
     * Tudo que a rota do PDF le do disco em tempo de execucao.
     *
     * Nada disso e descoberto pelo rastreamento automatico: sao caminhos que so
     * existem em runtime. E nada disso falha em desenvolvimento — local, o
     * Puppeteer usa o Chrome do sistema e os arquivos estao todos no lugar. O
     * sintoma aparece so em producao, como um 500 generico longe da causa.
     *
     * - public/: fontes e logos lidas por lib/pdf/ativos.ts. Na Vercel esses
     *   arquivos vao para a CDN, nao para o filesystem da funcao.
     * - @sparticuz/chromium/bin/: o proprio Chromium (62 MB comprimidos) mais as
     *   camadas que ele descomprime. Marcar o pacote como externo mantem os .js
     *   em node_modules, mas nao arrasta os binarios — e sem chromium.br a
     *   chamada a executablePath() falha antes de abrir o navegador.
     *
     * scripts/verificar-bundle-pdf.mjs confere esta lista contra o build.
     */
    "/api/comparativo": [
      "./public/fontes/**",
      "./public/marcas/**",
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
  },
};

export default nextConfig;
