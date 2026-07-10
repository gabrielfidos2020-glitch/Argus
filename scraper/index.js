const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────
// GET /health — Health check
// ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'scraper', type: 'lightweight', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────
// POST /screenshot — Fallback leve
// Como não temos mais Chromium/Playwright, vamos
// retornar uma imagem placeholder ou simular se necessário,
// ou obter o HTML em vez de capturar visualmente.
// ─────────────────────────────────────────
app.post('/screenshot', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ erro: 'url_obrigatoria', detalhe: 'Campo "url" é obrigatório' });
  }

  console.log(`[screenshot] Fallback sem Chromium para: ${url}`);
  
  // Retorna uma imagem 1x1 pixel cinza em base64 como stub
  const greyPixelBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  res.json({ imagem_base64: greyPixelBase64, aviso: "Serviço configurado no modo leve (sem Chromium)." });
});

// ─────────────────────────────────────────
// POST /scrape-maps — Busca leads no Google Maps
// Abordagem 1: Requisições HTTP diretas e parsing inteligente.
// Lógica completa será desenvolvida na Sprint 1.
// ─────────────────────────────────────────
app.post('/scrape-maps', async (req, res) => {
  const { query, regiao, limit = 10 } = req.body;

  if (!query || !regiao) {
    return res.status(400).json({
      erro: 'campos_obrigatorios',
      detalhe: 'Campos "query" e "regiao" são obrigatórios',
    });
  }

  console.log(`[scrape-maps] Buscando leads de forma leve: "${query}" em "${regiao}", limit=${limit}`);

  // Stub para a Sprint 0
  res.json({
    leads: [],
    aviso: 'Endpoint disponível em modo leve. Lógica HTTP nativa do Maps será implementada na Sprint 1.',
    params: { query, regiao, limit },
  });
});

// ─────────────────────────────────────────
// Inicialização
// ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[scraper] Rodando em modo leve na porta ${PORT}`);
});
