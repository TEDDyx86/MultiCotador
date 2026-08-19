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
     * As fontes e as logos do documento sao lidas do filesystem por
     * lib/pdf/ativos.ts. Na Vercel, os arquivos de public/ sao servidos pela CDN
     * mas nao entram automaticamente no bundle da funcao — sem esta lista, a
     * geracao do PDF quebra em producao com ENOENT, e so em producao.
     */
    "/api/comparativo": ["./public/fontes/**", "./public/marcas/**"],
  },
};

export default nextConfig;
