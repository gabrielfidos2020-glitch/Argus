const CONTEXTOS = {
  'Saúde/estética': { consequencia: 'pode estar afastando agendamentos sem perceber', observacao_sem_site: 'o paciente decide pela confiança visual antes de marcar', ramo: 'clínicas' },
  'Serviços profissionais': { consequencia: 'pode estar perdendo o cliente na primeira impressão', observacao_sem_site: 'o cliente busca credibilidade antes de fechar um contrato', ramo: 'escritórios' },
  'Comércio/loja física': { consequencia: 'pode estar indo direto pro concorrente que mostra melhor', observacao_sem_site: 'o cliente quer ver os produtos antes de ir até a loja', ramo: 'lojas' },
  'Eventos/hospedagem': { consequencia: 'pode estar descartando vocês antes de entrar em contato', observacao_sem_site: 'o cliente decide quase só pela primeira impressão visual', ramo: 'espaços' }
};

const leads = [
  { nome: 'Odonto Special', telefone: '5512999991111', canal: 'whatsapp', categoria_mapeada: 'Saúde/estética', tem_site: true, site_inacessivel: false, problemas_encontrados: ['Não há botão de WhatsApp visível logo no topo da página'] },
  { nome: 'Borges Teixeira Advocacia', telefone: '5512999992222', canal: 'whatsapp', categoria_mapeada: 'Serviços profissionais', tem_site: true, site_inacessivel: false, problemas_encontrados: ['A seção de perguntas frequentes ou explicação do processo está ausente'] },
  { nome: 'Atitude Modas', telefone: '5512999993333', canal: 'instagram', categoria_mapeada: 'Comércio/loja física', tem_site: true, site_inacessivel: false, problemas_encontrados: ['Não há uma galeria ou catálogo de produtos com fotos de qualidade'] },
  { nome: 'Espaço de Festa Sol', telefone: '5512999994444', canal: 'whatsapp', categoria_mapeada: 'Eventos/hospedagem', tem_site: false, site_inacessivel: false, problemas_encontrados: [] },
  { nome: 'Nutri Funcional SJC', telefone: '5512999995555', canal: 'instagram', categoria_mapeada: 'Saúde/estética', tem_site: false, site_inacessivel: true, problemas_encontrados: [] }
];

leads.forEach(lead => {
  const nicho = lead.categoria_mapeada || 'Saúde/estética';
  const contexto = CONTEXTOS[nicho] || CONTEXTOS['Saúde/estética'];
  let msg = '';
  
  if (lead.tem_site && !lead.site_inacessivel) {
    const problema = (lead.problemas_encontrados && lead.problemas_encontrados.length > 0) ? lead.problemas_encontrados[0].toLowerCase() : 'algumas coisas poderiam estar melhores';
    msg = `Oi! Vi a ${lead.nome} no Google e dei uma olhada no site de vocês.\n\nReparei que ${problema} — não é nada grave, mas pra negócios locais isso costuma pesar, porque ${contexto.consequencia}.\n\nEu trabalho justamente com isso, ajustando esse tipo de coisa em ${contexto.ramo} como o de vocês. Posso te mostrar exatamente o que vi e como resolver — topa conversar?`;
  } else {
    msg = `Oi! Vi a ${lead.nome} no Google e notei que vocês não têm site ainda, só aparecem por aqui mesmo.\n\nIsso chamou minha atenção porque ${contexto.observacao_sem_site} — e dá pra fazer isso ficar bem simples, sem virar um projeto grande ou caro.\n\nJá ajudei alguns negócios parecidos com isso. Se fizer sentido, posso te mostrar uns exemplos e a gente conversa se topa, sem compromisso nenhum.`;
  }
  
  lead.mensagem_gerada = msg;
  lead.status = 'aguardando_aprovacao';
  console.log('---');
  console.log(JSON.stringify(lead, null, 2));
});
