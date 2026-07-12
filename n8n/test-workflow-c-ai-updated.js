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
Escreva UMA mensagem curta de prospecção para WhatsApp ou Instagram.

OBJETIVO DA MENSAGEM: fazer o destinatário responder querendo saber mais. Não tente vender nada. Não explique a solução. Deixe a curiosidade trabalhar.

DADOS DA EMPRESA:
- Nome: ${lead.nome}
- Tipo de negócio: ${lead.tipo_negocio}
- Principal serviço: ${lead.principal_servico}

DIAGNÓSTICO:
- Problema encontrado: ${lead.problema_principal}

COMPORTAMENTO DO CLIENTE FINAL:
${ctx.comportamento}

ESTRUTURA OBRIGATÓRIA — texto corrido, sem títulos, sem numeração, na ordem exata:

BLOCO 1 - ABERTURA (1 frase):
Cumprimento direto + nome do negócio + que foi no site. Sem elogio.
Exemplo correto: 'Oi! Vi a Odonto Special no Google e dei uma olhada no site de vocês.'
Exemplo errado: 'Gostei muito do site de vocês!'

BLOCO 2 - CONTEXTO (1 frase):
Use APENAS o campo principal_servico dos dados. Se estiver vazio, pule este bloco completamente.
Nunca interprete nem complemente com informação que não está nos dados.
Exemplo correto: 'Deu para ver que vocês trabalham com Direito Tributário.'
Exemplo errado: 'Deu para ver que vocês oferecem um atendimento especializado e humanizado.'

BLOCO 3 - GANCHO (1 frase):
Diga que encontrou algo, mas NÃO revele o que é ainda. O objetivo é criar curiosidade.
Exemplo correto: 'Enquanto navegava, notei um detalhe que provavelmente está fazendo algumas pessoas desistirem antes de entrar em contato.'
Exemplo errado: 'Percebi que vocês não têm WhatsApp no site e isso está fazendo clientes irem embora.'

BLOCO 4 - PROBLEMA ESPECÍFICO (1 a 2 frases):
Agora revele o problema de forma concreta e direta. Este bloco é OBRIGATÓRIO e não pode ser pulado.
Descreva como um fato verificável, sem jargão.
Exemplo correto: 'O site não tem um jeito fácil de entrar em contato logo na primeira tela — quem acessa pelo celular precisa procurar bastante para achar um número ou botão.'
Exemplo errado: 'A meta description está ausente e o viewport não está configurado.'
Nunca usar: SEO, viewport, meta description, alt tag, SSL, cache, DOM, HTML, tag.

BLOCO 5 - IMPACTO (1 a 2 frases):
Descreva o comportamento real do cliente final usando o campo comportamento dos dados.
Tom coloquial e específico, não de manual.
Exemplo correto: 'Quem procura dentista pelo celular geralmente quer falar rápido. Se não acha o contato em segundos, a maioria volta no Google e chama outra clínica.'
Exemplo errado: 'Isso pode impactar negativamente a taxa de conversão do seu negócio.'

BLOCO 6 - AUTORIDADE (1 frase, após o impacto):
Uma frase simples. Sem número inventado, sem promessa de resultado.
Exemplo correto: 'Trabalho justamente com esse tipo de análise para negócios locais.'
Exemplo errado: 'Já ajudei mais de 50 empresas a triplicarem seus resultados.'

BLOCO 7 - CTA (1 frase):
Convite simples para conversa. Fácil de responder com sim ou não.
Exemplo correto: 'Posso te mostrar o que encontrei — topa conversar?'
Exemplo errado: 'Gostaria de agendar uma reunião para apresentar nossa proposta completa.'

REGRAS ABSOLUTAS:
- Blocos 1, 3, 4, 5, 6 e 7 são sempre obrigatórios
- Bloco 2 só aparece se principal_servico não estiver vazio
- Nunca pular Bloco 4 ou Bloco 5
- Nunca misturar Bloco 3 com Bloco 4
- Nunca inventar dado que não está nos dados
- Nunca elogiar automaticamente
- Nunca explicar a solução na primeira mensagem
- Tom de conversa, não de proposta comercial
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
