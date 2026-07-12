const axios = require('axios');

const OLLAMA_URL = 'http://ollama:11434';

const leads = [
  {
    nome: 'Odonto Special',
    tipo_negocio: 'Clínica odontológica',
    principal_servico: 'Tratamentos modernos e personalizados',
    categoria_mapeada: 'Saúde/estética',
    problema_principal: 'Não há botão de WhatsApp ou agendamento visível logo no topo da página',
    severidade: 'melhoria'
  },
  {
    nome: 'Borges Teixeira Advocacia',
    tipo_negocio: 'Escritório de Advocacia Tributária e Empresarial',
    principal_servico: 'Direito Tributário',
    categoria_mapeada: 'Serviços profissionais',
    problema_principal: 'Não há um formulário de contato simples ou WhatsApp direto de fácil acesso',
    severidade: 'critico'
  },
  {
    nome: 'Atitude Moda',
    tipo_negocio: 'Loja de Roupas',
    principal_servico: 'Moda feminina',
    categoria_mapeada: 'Comércio/loja física',
    problema_principal: 'Não há fotos de produtos visíveis',
    severidade: 'critico'
  }
];

const contexto_nicho = {
  'Saúde/estética': {
    cliente_final: 'paciente que procura clínica ou profissional de saúde',
    comportamento: 'Quem procura esse tipo de serviço pelo celular quer conseguir falar rapidamente. Quando não acha o contato em segundos, muita gente volta ao Google e chama outra opção.'
  },
  'Serviços profissionais': {
    cliente_final: 'cliente que procura advogado, contador ou profissional especializado',
    comportamento: 'Quem procura esse tipo de serviço costuma comparar 2 ou 3 opções antes de decidir. Quando o site não deixa claro o que faz ou como entrar em contato, a maioria segue para o próximo resultado.'
  },
  'Comércio/loja física': {
    cliente_final: 'cliente que pesquisa o produto antes de ir até a loja',
    comportamento: 'Quem pesquisa loja pelo celular quer ver o produto e saber onde fica antes de sair de casa. Quando o site não mostra isso claramente, o cliente vai direto para outra loja que aparece junto no Google.'
  },
  'Eventos/hospedagem': {
    cliente_final: 'cliente que decide o local do evento ou hospedagem pela primeira impressão visual',
    comportamento: 'Quem procura espaço para evento decide muito pela foto antes de qualquer outra coisa. Quando o site não mostra bem o espaço, o cliente passa para a próxima opção sem nem pedir orçamento.'
  }
};

async function testOllama() {
  for (const lead of leads) {
    console.log(`\n======================================================`);
    console.log(`Testando Lead: ${lead.nome}`);
    console.log(`======================================================`);

    const ctx = contexto_nicho[lead.categoria_mapeada] || contexto_nicho['Saúde/estética'];
    
    const prompt = `Você é um especialista em comunicação para freelancers brasileiros de desenvolvimento web. 
Escreva UMA mensagem de prospecção para WhatsApp ou Instagram usando APENAS os dados abaixo. 
Nunca invente informações.

DADOS DA EMPRESA:
- Nome: ${lead.nome}
- Tipo de negócio: ${lead.tipo_negocio}
- Principal serviço: ${lead.principal_servico}
- Nicho: ${lead.categoria_mapeada}

DIAGNÓSTICO:
- Problema principal: ${lead.problema_principal}
- Severidade: ${lead.severidade}

CONTEXTO DO CLIENTE FINAL:
- Quem é: ${ctx.cliente_final}
- Comportamento quando tem problema: ${ctx.comportamento}

ESTRUTURA OBRIGATÓRIA — texto corrido, sem títulos, sem numeração, sem JSON:

Bloco 1 — Abertura (1 frase):
Cumprimento + nome do negócio + que você foi no site.
Tom: 'Oi! Vi a [nome] no Google e dei uma olhada no site de vocês.'
Nunca elogiar aqui.

Bloco 2 — Contexto real (1 frase):
Use principal_servico para mostrar que entendeu o negócio. Só escrever se principal_servico não estiver vazio.
Tom: 'Deu para ver que vocês trabalham com [principal_servico].'

Bloco 3 — Oportunidade (1 frase):
Frame de oportunidade de melhoria, nunca de crítica.
Tom: 'Enquanto navegava, percebi uma oportunidade de melhoria que provavelmente está fazendo algumas pessoas desistirem antes de entrar em contato.'

Bloco 4 — Problema específico (até 2 frases):
Use o problema_principal. Descreva como fato concreto sem jargão técnico.
Nunca usar: SEO, viewport, meta description, alt tag, SSL, cache, DOM, HTML.

Bloco 5 — Impacto em comportamento (até 2 frases):
Use o comportamento do cliente final. Descreva o que a pessoa faz quando encontra o problema, não uma consequência abstrata.

Bloco 6 — Autoridade (1 frase):
Sem exagero, sem número inventado, sem promessa.
Tom: 'Trabalho justamente analisando esse tipo de melhoria para negócios locais.'

Bloco 7 — CTA (até 2 frases):
Convite para conversa, não para compra.
Tom: 'Posso te mostrar exatamente o que vi e como resolver — topa conversar?'

REGRAS ABSOLUTAS:
- Nunca elogiar automaticamente
- Nunca citar dado que não está nos dados fornecidos
- Nunca usar jargão técnico
- Nunca fazer promessa de resultado
- Tom natural, como pessoa escrevendo no WhatsApp
- Máximo 150 palavras
- Retornar APENAS o texto da mensagem, sem mais nada`;

    try {
      const resp = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: 'mistral',
        prompt: prompt,
        stream: false,
        options: {
          num_predict: 400,
          temperature: 0.3
        }
      }, { timeout: 300000 });
      
      const texto = resp.data.response.trim();
      
      // Validação
      let erros = [];
      const wordCount = texto.split(/\s+/).length;
      if (wordCount > 150) erros.push(`Texto longo (${wordCount} palavras)`);
      if (texto.match(/\[.*?\]/)) erros.push('Contém placeholders [ ]');
      const jargoes = ['seo', 'viewport', 'meta description', 'alt tag', 'ssl', 'https', 'cache', 'dom', 'html', 'tag'];
      const regexJargoes = new RegExp(`\\b(${jargoes.join('|')})\\b`, 'i');
      if (texto.match(regexJargoes)) erros.push('Contém jargões técnicos');
      if (texto.length === 0) erros.push('Texto vazio');
      
      console.log('MENSAGEM GERADA:\n');
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
