const axios = require('axios');
const OLLAMA_URL = 'http://ollama:11434';

// Gerando 5 leads para teste de consistência
const leads = [
  {
    nome: 'Odonto Special',
    problema_principal: 'Não há botão de WhatsApp ou agendamento visível logo no topo da página',
  },
  {
    nome: 'Borges Teixeira Advocacia',
    problema_principal: 'Não há um formulário de contato simples ou WhatsApp direto de fácil acesso',
  },
  {
    nome: 'Atitude Moda',
    problema_principal: 'Não há fotos de produtos visíveis',
  },
  {
    nome: 'Pousada Sol Nascente',
    problema_principal: 'Não há galeria de fotos do espaço físico com qualidade e variedade',
  },
  {
    nome: 'Contabilidade Ágil',
    problema_principal: 'A seção de perguntas frequentes ou explicação do processo de atendimento está ausente',
  }
];

async function testOllama() {
  let sucessos = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    console.log(`\n======================================================`);
    console.log(`Testando Lead ${i+1}/5: ${lead.nome}`);
    console.log(`Problema Original: ${lead.problema_principal}`);
    console.log(`======================================================`);

    const prompt = `Você é um especialista em comunicação de WhatsApp no Brasil. 
Sua única tarefa é reescrever o problema abaixo em uma frase coloquial e natural (máximo de 2 frases) para que se encaixe no meio de uma conversa com o dono da empresa.
Traduza o problema técnico para uma observação simples do ponto de vista do usuário final.
Não use jargão técnico como SEO, viewport, meta description, alt tag, SSL, cache, DOM, HTML, tag.

PROBLEMA ORIGINAL: 
"${lead.problema_principal}"

Retorne APENAS uma frase contendo a reescrita do problema. Não escreva nenhuma outra frase antes ou depois. Não adicione saudações, nem introduções. Não ofereça ajuda.`;

    try {
      const resp = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: 'mistral',
        prompt: prompt,
        stream: false,
        options: {
          num_predict: 80, // Limite baixo, já que esperamos no máximo 2 frases
          temperature: 0.1
        }
      }, { timeout: 300000 }); // 300s timeout
      
      let texto = resp.data.response.trim();
      
      // Validação Code Node
      let erros = [];
      
      // Limpeza de possíveis aspas que o LLM gosta de colocar
      texto = texto.replace(/^["']|["']$/g, '').trim();

      const wordCount = texto.split(/\s+/).length;
      if (wordCount > 40) erros.push(`Texto longo (${wordCount} palavras)`);
      
      // Checa frases indesejadas (bloqueio de blocos intrusos)
      const frasesProibidas = ['trabalho', 'se quiser', 'posso te', 'aqui está', 'claro', 'olá', 'oi', 'tudo bem'];
      const regexProibida = new RegExp(`\\b(${frasesProibidas.join('|')})\\b`, 'i');
      if (texto.match(regexProibida)) erros.push('Contém elementos típicos de outros blocos ou saudações');
      
      // Conta frases (rudimentar: conta pontuação final)
      const numFrases = (texto.match(/[.!?]+(?=\s|$)/g) || []).length;
      // Se não tiver pontuação, consideramos 1 frase
      const contagemRealFrases = numFrases === 0 ? 1 : numFrases;
      if (contagemRealFrases > 2) erros.push(`Tem mais de 2 frases (${contagemRealFrases} frases)`);

      if (texto.length === 0) erros.push('Texto vazio');
      
      console.log('--- REESCRITA (BLOCO 4) ---');
      console.log(texto);
      console.log('\n--- VALIDAÇÃO ---');
      if (erros.length > 0) {
        console.log(`❌ status: "erro_copy"`);
        console.log(`motivo_erro: ${erros.join(', ')}`);
      } else {
        console.log(`✅ status: "aguardando_aprovacao"`);
        console.log(`(Contagem de palavras: ${wordCount}, Frases: ${contagemRealFrases})`);
        sucessos++;
      }
      
    } catch (e) {
      console.error('Erro ao chamar Ollama:', e.message);
    }
  }
  
  console.log(`\n======================================================`);
  console.log(`RESULTADO FINAL: ${sucessos} / ${leads.length} aprovações.`);
  console.log(`======================================================`);
}

testOllama();
