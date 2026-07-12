const axios = require('axios');
const OLLAMA_URL = 'http://ollama:11434';

const leads = [
  {
    nome: 'Odonto Special',
    tipo_negocio: 'Clínica odontológica',
    principal_servico: 'Tratamentos modernos e personalizados',
    categoria_mapeada: 'Saúde/estética',
    problema_principal: 'Não há botão de WhatsApp ou agendamento visível logo no topo da página',
    severidade: 'melhoria',
    abertura: 'Oi! Vi a Odonto Special no Google e dei uma olhada no site de vocês.',
    cta: 'Se fizer sentido, posso te mostrar exatamente o que encontrei.'
  },
  {
    nome: 'Borges Teixeira Advocacia',
    tipo_negocio: 'Escritório de Advocacia Tributária e Empresarial',
    principal_servico: 'Direito Tributário',
    categoria_mapeada: 'Serviços profissionais',
    problema_principal: 'Não há um formulário de contato simples ou WhatsApp direto de fácil acesso',
    severidade: 'critico',
    abertura: 'Olá! Encontrei a Borges Teixeira Advocacia no Google e fui dar uma olhada no site.',
    cta: 'Caso tenha interesse, posso te passar o que vi em detalhes.'
  },
  {
    nome: 'Atitude Moda',
    tipo_negocio: 'Loja de Roupas',
    principal_servico: 'Moda feminina',
    categoria_mapeada: 'Comércio/loja física',
    problema_principal: 'Não há fotos de produtos visíveis',
    severidade: 'critico',
    abertura: 'Opa, tudo bem? eu vi o site da Atitude Moda',
    cta: 'Se quiser, posso te mostrar o que encontrei — sem compromisso .'
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

    const ctx = contexto_nicho[lead.categoria_mapeada];
    
    const prompt = `Você é um especialista em comunicação para freelancers brasileiros de desenvolvimento web. 
Escreva UMA mensagem de prospecção para WhatsApp ou Instagram usando APENAS os dados abaixo. 
Nunca invente informações. Nunca complete com suposições.

OBJETIVO: fazer o destinatário responder querendo saber mais. Não tente vender. Não explique a solução. Deixe a curiosidade trabalhar.

DADOS:
- Abertura: ${lead.abertura}
- Tipo de negócio: ${lead.tipo_negocio}
- Principal serviço: ${lead.principal_servico}
- Problema encontrado: ${lead.problema_principal}
- Comportamento do cliente final: ${ctx.comportamento}
- CTA: ${lead.cta}

ESTRUTURA OBRIGATÓRIA — texto corrido, sem títulos:

BLOCO 1:
Use exatamente o texto do campo Abertura dos dados.

BLOCO 2 (só se principal_servico não estiver vazio):
1 frase mostrando que entendeu o negócio.
Use APENAS o campo principal_servico, sem adicionar nada que não esteja nele.
Correto: 'Deu para ver que vocês trabalham com Direito Tributário.'
Errado: 'Deu para ver que vocês oferecem serviços especializados e humanizados.'

BLOCO 3:
1 frase de gancho sem revelar o problema ainda.
Use sempre: 'Enquanto navegava, notei um detalhe que provavelmente está fazendo algumas pessoas desistirem antes de entrar em contato.'

BLOCO 4 (obrigatório, nunca pular):
1 a 2 frases descrevendo o problema concreto.
Use o campo problema_encontrado dos dados.
Sem jargão técnico. Descreva como fato verificável.
Nunca usar: SEO, viewport, meta description, alt tag, SSL, cache, DOM, HTML, tag.

BLOCO 5 (obrigatório, nunca pular):
1 a 2 frases de impacto usando o campo comportamento dos dados.
Nunca fazer afirmações absolutas como 'a maioria' ou 'todo mundo'.
Use linguagem de observação: 'é comum', 'costuma acontecer', 'muita gente acaba'.
Correto: 'É comum a pessoa voltar ao Google e comparar outras opções quando não acha o contato rápido.'
Errado: 'A maioria dos clientes abandona o site imediatamente.'

BLOCO 6:
1 frase de autoridade simples.
Use sempre: 'Trabalho justamente com esse tipo de análise para negócios locais.'

BLOCO 7:
Use exatamente o texto do campo CTA dos dados.

REGRAS ABSOLUTAS:
- Blocos 1, 3, 4, 5, 6 e 7 sempre obrigatórios
- Bloco 2 só se principal_servico não estiver vazio
- Nunca inventar dado
- Nunca elogiar automaticamente
- Nunca explicar a solução
- Nunca usar afirmações absolutas
- Nunca usar jargão técnico
- Máximo 120 palavras
- Retornar APENAS o texto da mensagem`;

    try {
      const resp = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: 'mistral',
        prompt: prompt,
        stream: false,
        options: {
          num_predict: 350,
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
