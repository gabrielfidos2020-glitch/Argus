const axios = require('axios');
const OLLAMA_URL = 'http://ollama:11434';

const leads = [
  {
    nome: 'Odonto Special',
    tipo_negocio: 'Clínica odontológica',
    principal_servico: 'Tratamentos modernos e personalizados',
    categoria_mapeada: 'Saúde/estética',
    problema_principal: 'Não há botão de WhatsApp ou agendamento visível logo no topo da página',
    index: 0
  },
  {
    nome: 'Borges Teixeira Advocacia',
    tipo_negocio: 'Escritório de Advocacia Tributária e Empresarial',
    principal_servico: 'Direito Tributário',
    categoria_mapeada: 'Serviços profissionais',
    problema_principal: 'Não há um formulário de contato simples ou WhatsApp direto de fácil acesso',
    index: 1
  },
  {
    nome: 'Atitude Moda',
    tipo_negocio: 'Loja de Roupas',
    principal_servico: 'Moda feminina',
    categoria_mapeada: 'Comércio/loja física',
    problema_principal: 'Não há fotos de produtos visíveis',
    index: 2
  }
];

const lib = {
  abertura: [
    "Oi! Encontrei a [nome] no Google e dei uma olhada no site de vocês.",
    "Oi! Passei pelo site de vocês e uma coisa me chamou atenção.",
    "Oi! Estava pesquisando empresas da região e acabei chegando no site de vocês."
  ],
  contexto: [
    "Vi que vocês trabalham com [principal_servico].",
    "Acabei vendo que vocês atuam na área de [principal_servico].",
    "Pelo que vi no site, o foco de vocês é [principal_servico]."
  ],
  gancho: [
    "Enquanto olhava o site, teve um detalhe que me chamou atenção.",
    "Navegando por ele, encontrei algo que acho que vale mostrar.",
    "Vi uma coisa no site que pode estar atrapalhando sem vocês perceberem."
  ],
  impacto: [
    "No fim, quem está com pressa normalmente não insiste muito.",
    "Esse tipo de detalhe faz muita gente fechar a página antes de entrar em contato.",
    "Nessa hora muita gente acaba indo para outro resultado."
  ],
  cta: [
    "Se fizer sentido, posso te mostrar exatamente o que encontrei.",
    "Posso te explicar melhor o que vi.",
    "Se quiser, te mostro em dois minutos."
  ]
};

async function testOllama() {
  for (const lead of leads) {
    console.log(`\n======================================================`);
    console.log(`Testando Lead: ${lead.nome}`);
    console.log(`======================================================`);

    // Assign variation by index to ensure they are different
    const abertura_escolhida = lib.abertura[lead.index].replace('[nome]', lead.nome);
    const contexto_escolhido = lead.principal_servico ? lib.contexto[lead.index].replace('[principal_servico]', lead.principal_servico.toLowerCase()) : '';
    const gancho_escolhido = lib.gancho[lead.index];
    const impacto_escolhido = lib.impacto[lead.index];
    const cta_escolhido = lib.cta[lead.index];
    
    console.log(`--- VARIAÇÕES ESCOLHIDAS ---`);
    console.log(`Bloco 1 (Abertura): ${abertura_escolhida}`);
    if (contexto_escolhido) console.log(`Bloco 2 (Contexto): ${contexto_escolhido}`);
    console.log(`Bloco 3 (Gancho): ${gancho_escolhido}`);
    console.log(`Bloco 5 (Impacto): ${impacto_escolhido}`);
    console.log(`Bloco 7 (CTA): ${cta_escolhido}`);
    console.log(`----------------------------`);

    let bloco2Prompt = contexto_escolhido ? `\nBLOCO 2 - CONTEXTO:\n${contexto_escolhido}` : '';

    const prompt = `Você escreve mensagens de prospecção para WhatsApp no Brasil. Sua única tarefa é conectar os blocos abaixo em ordem, adaptando apenas o Bloco 4 para que encaixe naturalmente com o restante. Não mude nenhum outro bloco. Não adicione informação nova. Não elogie. Não explique a solução.

BLOCOS PRÉ-MONTADOS (use na ordem exata):

BLOCO 1 - ABERTURA:
${abertura_escolhida}
${bloco2Prompt}
BLOCO 3 - GANCHO:
${gancho_escolhido}

BLOCO 4 - PROBLEMA (adapte este para soar natural em continuação ao gancho, sem jargão técnico, máximo 2 frases):
${lead.problema_principal}

BLOCO 5 - IMPACTO:
${impacto_escolhido}

BLOCO 6 - AUTORIDADE:
Trabalho justamente com esse tipo de análise para negócios locais.

BLOCO 7 - CTA:
${cta_escolhido}

REGRAS:
- Use os blocos exatamente como estão, exceto o Bloco 4 que você adapta
- Nunca use: SEO, viewport, meta description, alt tag, SSL, cache, DOM, HTML, tag
- Nunca invente informação
- Nunca elogie automaticamente
- Máximo 120 palavras no total
- Retorne APENAS o texto final, sem explicação`;

    try {
      const resp = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: 'mistral',
        prompt: prompt,
        stream: false,
        options: {
          num_predict: 300,
          temperature: 0.1
        }
      }, { timeout: 600000 }); // 10 minutes limit per inference
      
      const texto = resp.data.response.trim();
      
      // Validação
      let erros = [];
      const wordCount = texto.split(/\s+/).length;
      if (wordCount > 120) erros.push(`Texto longo (${wordCount} palavras)`);
      if (texto.match(/\[.*?\]/)) erros.push('Contém placeholders [ ]');
      const jargoes = ['seo', 'viewport', 'meta description', 'alt tag', 'ssl', 'https', 'cache', 'dom', 'html', 'tag'];
      const regexJargoes = new RegExp(`\\b(${jargoes.join('|')})\\b`, 'i');
      if (texto.match(regexJargoes)) erros.push('Contém jargões técnicos');
      if (texto.length === 0) erros.push('Texto vazio');
      
      console.log('\n--- MENSAGEM GERADA ---');
      console.log(texto);
      console.log('\n--- VALIDAÇÃO ---');
      if (erros.length > 0) {
        console.log(`❌ status: "erro_copy"`);
        console.log(`motivo_erro: ${erros.join(', ')}`);
      } else {
        console.log(`✅ status: "aguardando_aprovacao"`);
        console.log(`(Contagem de palavras: ${wordCount})`);
      }
      
    } catch (e) {
      console.error('Erro ao chamar Ollama:', e.message);
    }
  }
}

testOllama();
