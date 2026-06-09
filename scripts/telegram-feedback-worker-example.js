export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const payload = await request.json();
    const text = [
      'Нове звернення з сайту СТ «Горизонт»',
      '',
      `Ім'я: ${payload.name || '-'}`,
      `№ ділянки: ${payload.plot || '-'}`,
      `Телефон: ${payload.phone || '-'}`,
      '',
      'Повідомлення:',
      payload.message || '-',
      '',
      `Дата: ${payload.submittedAt || '-'}`
    ].join('\n');

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text
        })
      }
    );

    if (!telegramResponse.ok) {
      return new Response('Telegram send failed', { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
