const axios = require('axios');

async function testSend() {
  console.log('--- TESTE WHATSAPP ---');
  try {
    const res = await axios.post('http://evolution-api:8080/message/sendText/default', {
      number: '5511999999999',
      text: 'Oi, teste de envio via Workflow C (WhatsApp)'
    }, {
      headers: { 'apikey': 'changeme' }
    });
    console.log('✅ Sucesso WhatsApp:', res.data);
  } catch (error) {
    const msg = error.response ? error.response.data : error.message;
    console.log('❌ Erro WhatsApp (esperado se não houver QR code):', JSON.stringify(msg));
  }

  console.log('\n--- TESTE INSTAGRAM ---');
  try {
    const res = await axios.post('http://instagrapi:8001/direct/send', {
      username: 'testuser',
      message: 'Oi, teste de envio via Workflow C (Instagram)'
    });
    console.log('✅ Sucesso Instagram:', res.data);
  } catch (error) {
    const msg = error.response ? error.response.data : error.message;
    console.log('❌ Erro Instagram (esperado se não logado):', JSON.stringify(msg));
  }
}

testSend();
