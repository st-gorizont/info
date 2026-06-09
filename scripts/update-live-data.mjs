import { writeFile, mkdir } from 'node:fs/promises';

const POWER_URL = 'https://chernigiv.energy-ua.info/cherga/3-1';
const ALERT_URL = 'https://alarmmap.online/ua/atu/chernigivska-oblast/chernigivskij-rayon/air';

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'st-gorizont-live-status-updater/1.0',
      accept: 'text/html,application/xhtml+xml'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  return response.text();
}

function parsePower(html) {
  const text = cleanText(html);
  const rangesBlock = text.match(/Періоди відключень на сьогодні(.*?)Періоди відключень на завтра/i);
  const queue = text.match(/У вас\s+([^!]+)!/i);
  const warning = text.match(/УВАГА![^.]*\./i);
  const period = rangesBlock ? rangesBlock[1].match(/З\s+\d{2}:\d{2}\s+до\s+\d{2}:\d{2}/g) : null;

  if (period && period.length) {
    return {
      status: `Планові відключення сьогодні: ${period.join(', ')}`,
      meta: `${queue ? queue[0].replace(/\s+/g, ' ').trim() : 'Черга 3.1.'} ${warning ? warning[0] : ''}`.trim(),
      sourceUrl: POWER_URL
    };
  }

  const noData = /Періоди відключень на сьогодні\s+Немає даних/i.test(text);
  if (noData) {
    return {
      status: 'На сьогодні планові відключення не вказані',
      meta: queue ? queue[0].replace(/\s+/g, ' ').trim() : 'Черга 3.1, Чернігівська область.',
      sourceUrl: POWER_URL
    };
  }

  return {
    status: 'Не вдалося розібрати графік автоматично',
    meta: 'Перевірте джерело energy-ua.info вручну.',
    sourceUrl: POWER_URL
  };
}

function parseAlert(html) {
  const text = cleanText(html);
  const announced = text.match(/Повітряна тривога Оголошено в:\s*([0-9:]+\s*-\s*[0-9]+\s+\S+\s+[0-9]{4}\s*p?\.)/i);
  const activeNow = /Тривають зараз\s+[1-9]/i.test(text) || /Триває\s+\d+\s+хв\./i.test(text);

  if (announced && activeNow) {
    return {
      status: 'Повітряна тривога оголошена',
      meta: `Чернігівський район: ${announced[1]}. Для с. Жавинка орієнтуйтесь саме на цей статус.`,
      sourceUrl: ALERT_URL
    };
  }

  return {
    status: 'Зараз повітряна тривога не оголошена',
    meta: 'Чернігівський район. Дані оновлюються з alarmmap.online.',
    sourceUrl: ALERT_URL
  };
}

async function main() {
  const [powerHtml, alertHtml] = await Promise.all([
    fetchText(POWER_URL),
    fetchText(ALERT_URL)
  ]);

  const payload = {
    updatedAt: new Date().toISOString(),
    power: parsePower(powerHtml),
    alert: parseAlert(alertHtml)
  };

  await mkdir('data', { recursive: true });
  await writeFile('data/live-status.json', JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
