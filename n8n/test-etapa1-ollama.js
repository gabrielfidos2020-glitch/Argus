/**
 * ETAPA 1 — Teste Ollama + filtragem de HTML
 * Site: odontospecialsjc.com.br
 */
const axios = require('axios');

const SITE_URL   = 'https://odontospecialsjc.com.br/';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';

// ─── Filtragem de HTML ────────────────────────────────────────
function filtrarHTML(html) {
  // Remove script, style e seus conteúdos
  let filtrado = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Extrai título
  const titleMatch = filtrado.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? `TITLE: ${titleMatch[1].trim()}` : '';

  // Extrai meta tags relevantes
  const metas = [];
  const metaRe = /<meta[^>]+>/gi;
  let m;
  while ((m = metaRe.exec(filtrado)) !== null) {
    if (/description|viewport|charset|keywords/i.test(m[0])) {
      metas.push(m[0].replace(/\s+/g, ' ').trim());
    }
  }

  // Extrai headings h1-h6
  const headings = [];
  const headRe = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  while ((m = headRe.exec(filtrado)) !== null) {
    const texto = m[2].replace(/<[^>]+>/g, '').trim();
    if (texto) headings.push(`H${m[1]}: ${texto}`);
  }

  // Extrai hrefs (links)
  const hrefs = [];
  const hrefRe = /href=["']([^"']+)["']/gi;
  while ((m = hrefRe.exec(filtrado)) !== null) {
    if (!m[1].startsWith('#') && m[1].trim()) hrefs.push(m[1].trim());
  }

  // Extrai alt e src de imagens
  const imgs = [];
  const imgRe = /<img[^>]+>/gi;
  while ((m = imgRe.exec(filtrado)) !== null) {
    const alt = (m[0].match(/alt=["']([^"']*)["']/i) || [])[1] || '';
    const src = (m[0].match(/src=["']([^"']*)["']/i) || [])[1] || '';
    imgs.push(`IMG alt="${alt}" src="${src.substring(0, 60)}"`);
  }

  // Remove todas as tags HTML restantes e comprime espaços
  const textoLimpo = filtrado
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 1000);

  const partes = [
    title,
    metas.length  ? 'METAS:\n'    + metas.slice(0, 5).join('\n')    : '',
    headings.length ? 'HEADINGS:\n' + headings.slice(0, 8).join('\n') : '',
    hrefs.length  ? 'LINKS:\n'    + hrefs.slice(0, 10).join('\n')   : '',
    imgs.length   ? 'IMAGENS:\n'  + imgs.slice(0, 6).join('\n')     : '',
    textoLimpo    ? 'TEXTO:\n'    + textoLimpo                       : '',
  ].filter(Boolean).join('\n\n');

  return partes;
}

// ─── Extrai JSON de string que pode ter texto ao redor ────────
function extrairJSON(texto) {
  const match = texto.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Nenhum JSON encontrado na resposta');
  return JSON.parse(match[0]);
}

async function testarEtapa1() {
  console.log('═'.repeat(60));
  console.log('  ETAPA 1 — Teste Ollama + Filtragem de HTML');
  console.log('═'.repeat(60));

  // ── PASSO 1: Baixar HTML ──────────────────────────────────
  console.log('\n[1/3] Baixando HTML de', SITE_URL);
  let html;
  try {
    const resp = await axios.get(SITE_URL, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProspeccaoBot/1.0)' },
    });
    html = resp.data;
    console.log(`      → ${html.length} caracteres brutos recebidos`);
  } catch (e) {
    console.error('      ✗ Falha ao baixar HTML:', e.message);
    process.exit(1);
  }

  // ── PASSO 2: Filtrar HTML ─────────────────────────────────
  console.log('\n[2/3] Filtrando HTML...');
  const htmlFiltrado = filtrarHTML(html);
  console.log(`      → ${htmlFiltrado.length} caracteres após filtragem`);

  console.log('\n─── HTML FILTRADO (primeiros 500 caracteres) ───────────');
  console.log(htmlFiltrado.substring(0, 500));
  console.log('────────────────────────────────────────────────────────');

  // Verifica suficiência
  const textoSuficiente = htmlFiltrado.length >= 300;
  console.log(`\n      needs_screenshot: ${!textoSuficiente} (texto ${textoSuficiente ? '≥' : '<'} 300 chars)`);

  // ── PASSO 3: Chamar Ollama ────────────────────────────────
  console.log('\n[3/3] Chamando Ollama (mistral)... aguarde ~30s');
  const prompt = `Você é um consultor de presença digital para pequenas empresas brasileiras. Analise o HTML abaixo de um site de negócio local e identifique 2 a 3 problemas que estão fazendo esse negócio PERDER CLIENTES.

Regras obrigatórias:
- Escreva em português brasileiro natural e direto
- Use linguagem que um dono de negócio sem conhecimento técnico entenda imediatamente
- Foque em problemas que impactam vendas e contato com cliente
- Exemplos de bons problemas: 'O site não tem botão de WhatsApp visível, o cliente não consegue entrar em contato facilmente', 'O site demora para carregar no celular, a maioria dos clientes desiste antes de ver os serviços', 'Não há fotos dos procedimentos, o cliente não sabe o que esperar'
- Exemplos de problemas ruins (EVITE): 'alt tag inválida', 'ausência de copyright', 'meta viewport ausente'
- Retorne APENAS JSON válido sem nenhum texto fora do JSON
- Formato exato: {"problemas": ["problema 1", "problema 2"], "severidade": "critico" ou "melhoria"}
- severidade = critico se algum problema impede contato ou uso básico do site. severidade = melhoria para os demais casos.

HTML do site: ${htmlFiltrado.substring(0, 1000)}`;

  let respostaOllama;
  try {
    const resp = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model:  'mistral',
      prompt: prompt,
      stream: false,
    }, { timeout: 300000 });
    respostaOllama = resp.data.response;
  } catch (e) {
    console.error('      ✗ Falha ao chamar Ollama:', e.message);
    process.exit(1);
  }

  console.log('\n─── OUTPUT BRUTO DO OLLAMA ──────────────────────────────');
  console.log(respostaOllama);
  console.log('────────────────────────────────────────────────────────');

  // ── PASSO 4: Validar JSON ─────────────────────────────────
  console.log('\n─── VALIDAÇÃO DO JSON ───────────────────────────────────');
  try {
    const parsed = extrairJSON(respostaOllama);
    const temProblemas = Array.isArray(parsed.problemas) && parsed.problemas.length > 0;
    const temSeveridade = ['critico', 'melhoria'].includes(parsed.severidade);

    console.log('JSON válido:', JSON.stringify(parsed, null, 2));
    console.log(`\n✅ campo "problemas": ${temProblemas ? 'OK (' + parsed.problemas.length + ' itens)' : '✗ AUSENTE ou vazio'}`);
    console.log(`✅ campo "severidade": ${temSeveridade ? 'OK ("' + parsed.severidade + '")' : '✗ valor inválido: "' + parsed.severidade + '"'}`);

    if (temProblemas && temSeveridade) {
      console.log('\n🎉 ETAPA 1 APROVADA — Ollama respondeu corretamente.');
    } else {
      console.log('\n⚠️  ETAPA 1 COM RESSALVAS — JSON presente mas campos incompletos.');
    }
  } catch (e) {
    console.log('✗ JSON inválido:', e.message);
    console.log('⚠️  ETAPA 1 FALHOU — Ollama não retornou JSON válido.');
  }
  console.log('════════════════════════════════════════════════════════');
}

testarEtapa1().catch(e => {
  console.error('ERRO FATAL:', e.message);
  process.exit(1);
});
