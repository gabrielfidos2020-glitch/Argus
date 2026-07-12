/**
 * TESTE MULTI-NICHO — Ollama + Filtragem de HTML
 * Uso: node test-nicho-ollama.js <URL> <nicho>
 * Nichos: "saude" | "servicos" | "comercio" | "eventos"
 */
const axios = require('axios');

const SITE_URL   = process.argv[2] || 'https://odontospecialsjc.com.br/';
const NICHO_ARG  = (process.argv[3] || 'saude').toLowerCase();
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';

// ─── Mapa de nichos ───────────────────────────────────────────
const NICHOS = {
  saude:    'Saúde/estética',
  servicos: 'Serviços profissionais',
  comercio: 'Comércio/loja física',
  eventos:  'Eventos/hospedagem',
};
const CATEGORIA = NICHOS[NICHO_ARG] || 'Saúde/estética';

// ─── Prompts por nicho ────────────────────────────────────────
function getPrompt(categoria, htmlFiltrado) {
  const html = htmlFiltrado.substring(0, 1000);

  const prompts = {
    'Saúde/estética': `Você é um consultor de presença digital para pequenas empresas brasileiras. Analise o HTML abaixo de um site de clínica, consultório ou estabelecimento de saúde/estética e identifique 2 a 3 elementos importantes que estão FALTANDO ou mal implementados, que podem estar fazendo esse negócio perder pacientes ou clientes.

Um site de saúde/estética que converte bem precisa ter:
- Botão de WhatsApp ou agendamento visível logo no topo da página
- Lista clara dos serviços ou tratamentos oferecidos com descrição simples (não só o nome)
- Foto e nome dos profissionais que atendem (paciente quer saber quem vai atender antes de marcar)
- Depoimentos reais de pacientes ou clientes
- Endereço completo, horário de funcionamento e mapa
- Site rápido e funcional no celular
- Certificado de segurança (https) ativo

Analise o HTML e identifique o que está faltando ou poderia melhorar. Foque nos elementos que mais impactam a decisão do paciente de entrar em contato.

Regras: português brasileiro natural e direto, linguagem que um dono de clínica sem conhecimento técnico entenda, foque no impacto para o negócio. Retorne APENAS JSON válido sem texto fora do JSON. Formato: {"problemas": ["problema 1", "problema 2"], "severidade": "critico" ou "melhoria", "contexto_empresa": {"tipo_negocio": "ex: Clínica odontológica", "principal_servico": "ex: Implantes", "objetivo_site": "ex: Gerar agendamentos"}}. severidade = critico se falta botão de contato, lista de serviços ou o site não funciona no celular. Regras obrigatórias para contexto_empresa: use APENAS informações encontradas no HTML, nunca invente ou presuma, se não encontrar retorne string vazia.

HTML: ${html}`,

    'Serviços profissionais': `Você é um consultor de presença digital para pequenas empresas brasileiras. Analise o HTML abaixo de um site de escritório profissional (advocacia, contabilidade, arquitetura, imobiliária ou consultoria) e identifique 2 a 3 elementos importantes que estão FALTANDO ou mal implementados, que podem estar fazendo esse negócio perder clientes.

Um site de serviços profissionais que converte bem precisa ter:
- Especialidades ou áreas de atuação explicadas claramente logo na entrada (cliente precisa saber em segundos se você resolve o problema dele)
- Credenciais visíveis: tempo de experiência, registro profissional (OAB, CRC, CAU), número de casos atendidos
- Formulário de contato simples ou WhatsApp direto de fácil acesso
- Depoimentos de clientes reais com nome e contexto
- Seção de perguntas frequentes ou explicação do processo de atendimento
- Informação de localização e horário de atendimento

Regras: português brasileiro natural e direto, linguagem que um advogado ou contador sem conhecimento técnico de web entenda. Retorne APENAS JSON válido. Formato: {"problemas": ["problema 1", "problema 2"], "severidade": "critico" ou "melhoria", "contexto_empresa": {"tipo_negocio": "ex: Escritório de Advocacia", "principal_servico": "ex: Direito Tributário", "objetivo_site": "ex: Receber contatos"}}. severidade = critico se não há forma clara de contato ou especialidades não descritas. Regras obrigatórias para contexto_empresa: use APENAS informações encontradas no HTML, nunca invente ou presuma, se não encontrar retorne string vazia.

HTML: ${html}`,

    'Comércio/loja física': `Você é um consultor de presença digital para pequenas empresas brasileiras. Analise o HTML abaixo de um site de loja física (roupas, móveis, decoração, joalheria ou presentes) e identifique 2 a 3 elementos importantes que estão FALTANDO ou mal implementados, que podem estar fazendo essa loja perder clientes antes mesmo de eles visitarem o espaço físico.

Um site de loja física que converte bem precisa ter:
- Galeria ou catálogo de produtos com fotos de qualidade (cliente quer ver o produto antes de ir até a loja)
- Botão de WhatsApp visível para tirar dúvidas ou checar disponibilidade
- Endereço completo com mapa e horário de funcionamento em destaque
- Pelo menos uma indicação de faixa de preço ou promoção ativa
- Link para Instagram atualizado (prova visual do estoque)
- Site funcional no celular

Regras: português brasileiro natural e direto, linguagem que um dono de loja sem conhecimento técnico entenda. Retorne APENAS JSON válido. Formato: {"problemas": ["problema 1", "problema 2"], "severidade": "critico" ou "melhoria", "contexto_empresa": {"tipo_negocio": "ex: Loja de Roupas", "principal_servico": "ex: Moda feminina", "objetivo_site": "ex: Vender online"}}. severidade = critico se não há fotos de produto, endereço ou forma de contato visível. Regras obrigatórias para contexto_empresa: use APENAS informações encontradas no HTML, nunca invente ou presuma, se não encontrar retorne string vazia.

HTML: ${html}`,

    'Eventos/hospedagem': `Você é um consultor de presença digital para pequenas empresas brasileiras. Analise o HTML abaixo de um site de buffet, espaço para eventos, pousada ou hotel e identifique 2 a 3 elementos importantes que estão FALTANDO ou mal implementados, que podem estar fazendo esse negócio perder reservas e contratos.

Um site de eventos/hospedagem que converte bem precisa ter:
- Galeria de fotos do espaço físico com qualidade e variedade (elemento mais decisivo — cliente compra visualmente)
- Capacidade do espaço e tipos de evento atendidos descritos claramente (casamento, aniversário, corporativo, quantos convidados)
- Formulário de orçamento ou WhatsApp direto de fácil acesso
- Depoimentos ou fotos de eventos reais já realizados no espaço
- Localização com mapa e como chegar
- Informação de disponibilidade ou como verificar datas livres

Regras: português brasileiro natural e direto, linguagem que um dono de buffet ou pousada sem conhecimento técnico entenda. Retorne APENAS JSON válido. Formato: {"problemas": ["problema 1", "problema 2"], "severidade": "critico" ou "melhoria", "contexto_empresa": {"tipo_negocio": "ex: Pousada", "principal_servico": "ex: Hospedagem com café", "objetivo_site": "ex: Gerar reservas"}}. severidade = critico se não há galeria de fotos do espaço ou forma de solicitar orçamento. Regras obrigatórias para contexto_empresa: use APENAS informações encontradas no HTML, nunca invente ou presuma, se não encontrar retorne string vazia.

HTML: ${html}`,
  };

  return prompts[categoria] || prompts['Saúde/estética'];
}

// ─── Filtragem de HTML ────────────────────────────────────────
function filtrarHTML(html) {
  let filtrado = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const titleMatch = filtrado.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? `TITLE: ${titleMatch[1].trim()}` : '';

  const metas = [];
  const metaRe = /<meta[^>]+>/gi;
  let m;
  while ((m = metaRe.exec(filtrado)) !== null) {
    if (/description|viewport|charset|keywords/i.test(m[0])) {
      metas.push(m[0].replace(/\s+/g, ' ').trim());
    }
  }

  const headings = [];
  const headRe = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  while ((m = headRe.exec(filtrado)) !== null) {
    const texto = m[2].replace(/<[^>]+>/g, '').trim();
    if (texto) headings.push(`H${m[1]}: ${texto}`);
  }

  const hrefs = [];
  const hrefRe = /href=["']([^"']+)["']/gi;
  while ((m = hrefRe.exec(filtrado)) !== null) {
    if (!m[1].startsWith('#') && m[1].trim()) hrefs.push(m[1].trim());
  }

  const imgs = [];
  const imgRe = /<img[^>]+>/gi;
  while ((m = imgRe.exec(filtrado)) !== null) {
    const alt = (m[0].match(/alt=["']([^"']*)["']/i) || [])[1] || '';
    const src = (m[0].match(/src=["']([^"']*)["']/i) || [])[1] || '';
    imgs.push(`IMG alt="${alt}" src="${src.substring(0, 60)}"`);
  }

  const textoLimpo = filtrado
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 1000);

  const partes = [
    title,
    metas.length    ? 'METAS:\n'    + metas.slice(0, 5).join('\n')    : '',
    headings.length ? 'HEADINGS:\n' + headings.slice(0, 8).join('\n') : '',
    hrefs.length    ? 'LINKS:\n'    + hrefs.slice(0, 10).join('\n')   : '',
    imgs.length     ? 'IMAGENS:\n'  + imgs.slice(0, 6).join('\n')     : '',
    textoLimpo      ? 'TEXTO:\n'    + textoLimpo                      : '',
  ].filter(Boolean).join('\n\n');

  return partes;
}

// ─── Extrai JSON de string que pode ter texto ao redor ────────
function extrairJSON(texto) {
  // Tenta encontrar JSON completo
  let match = texto.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (_) {}
  }
  // Fallback: JSON pode estar truncado (sem } final) — tenta completar
  const inicio = texto.indexOf('{');
  if (inicio !== -1) {
    const candidato = texto.slice(inicio).trim();
    const tentativas = [candidato + '}', candidato + '"melhoria"}'  ];
    for (const t of tentativas) {
      try { return JSON.parse(t); } catch (_) {}
    }
  }
  throw new Error('Nenhum JSON encontrado na resposta');
}

// ─── Main ─────────────────────────────────────────────────────
(async () => {
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  TESTE NICHO: ${CATEGORIA}`);
  console.log(`  URL: ${SITE_URL}`);
  console.log('════════════════════════════════════════════════════════════\n');

  console.log(`[1/3] Baixando HTML de ${SITE_URL}`);
  let htmlBruto = '';
  let httpError = false;
  try {
    const resp = await axios.get(SITE_URL, { timeout: 10000 });
    htmlBruto = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
    console.log(`      → ${htmlBruto.length} caracteres brutos recebidos\n`);
  } catch (e) {
    console.log(`      ✗ Falha ao baixar HTML: ${e.message} (Simulando n8n onError: continueRegularOutput)\n`);
    httpError = true;
  }

  if (httpError || htmlBruto.length < 100) {
    console.log('─── WORKFLOW B OUTPUT (SITE INACESSÍVEL) ───────────────');
    console.log(JSON.stringify({
      nome: 'Lead Falso',
      site: SITE_URL,
      categoria_mapeada: CATEGORIA,
      tem_site: true,
      site_inacessivel: true,
      problemas_encontrados: [],
      severidade: 'erro_acesso'
    }, null, 2));
    console.log('────────────────────────────────────────────────────────\n');
    console.log('✅ Comportamento validado: O fluxo não trava e continua pelo nó Registrar Site Inacessível.');
    process.exit(0);
  }

  // PASSO 2: Filtrar HTML
  console.log('\n[2/3] Filtrando HTML...');
  const htmlFiltrado = filtrarHTML(htmlBruto);
  console.log(`      → ${htmlFiltrado.length} caracteres após filtragem`);
  const needs_screenshot = htmlFiltrado.length < 300;
  console.log(`      needs_screenshot: ${needs_screenshot}`);

  console.log('\n─── HTML FILTRADO (primeiros 500 chars) ────────────────');
  console.log(htmlFiltrado.substring(0, 500));
  console.log('────────────────────────────────────────────────────────');

  // PASSO 3: Chamar Ollama
  console.log('\n[3/3] Chamando Ollama (mistral)... aguarde');
  const prompt = getPrompt(CATEGORIA, htmlFiltrado);

  let respostaOllama;
  try {
    const resp = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model:       'mistral',
      prompt:      prompt,
      stream:      false,
      options: {
        num_predict: 400,   // limite maior para comportar o contexto_empresa
        temperature: 0.1,   // mais determinístico, menos divagação
      },
    }, { timeout: 300000 });
    respostaOllama = resp.data.response;
  } catch (e) {
    console.error('      ✗ Falha ao chamar Ollama:', e.message);
    process.exit(1);
  }

  console.log('\n─── OUTPUT BRUTO DO OLLAMA ──────────────────────────────');
  console.log(respostaOllama);
  console.log('────────────────────────────────────────────────────────');

  // PASSO 4: Validar JSON
  console.log('\n─── VALIDAÇÃO DO JSON ───────────────────────────────────');
  try {
    const parsed = extrairJSON(respostaOllama);
    const temProblemas = Array.isArray(parsed.problemas) && parsed.problemas.length > 0;
    const temSeveridade = ['critico', 'melhoria'].includes(parsed.severidade);
    const temContexto = typeof parsed.contexto_empresa === 'object' && parsed.contexto_empresa !== null;

    console.log('JSON válido:', JSON.stringify(parsed, null, 2));
    console.log(`\n✅ campo "problemas": ${temProblemas ? 'OK (' + parsed.problemas.length + ' itens)' : '✗ AUSENTE ou vazio'}`);
    console.log(`✅ campo "severidade": ${temSeveridade ? 'OK ("' + parsed.severidade + '")' : '✗ valor inválido: "' + parsed.severidade + '"'}`);
    console.log(`✅ campo "contexto_empresa": ${temContexto ? 'OK' : '✗ AUSENTE'}`);

    if (temProblemas && temSeveridade && temContexto) {
      console.log('\n🎉 APROVADO — Ollama respondeu corretamente para o nicho ' + CATEGORIA);
    } else {
      console.log('\n⚠️  COM RESSALVAS — JSON presente mas campos incompletos.');
    }
  } catch (e) {
    console.log('✗ JSON inválido:', e.message);
    console.log('⚠️  FALHOU — Ollama não retornou JSON válido.');
  }
  console.log('════════════════════════════════════════════════════════');
})();
