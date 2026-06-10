import { writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const POWER_URL = 'https://bezsvitla.com.ua/chernihivska-oblast/cherha-3-1';
const ALERT_URL = 'https://ubilling.net.ua/aerialalerts/';
const ALERT_MAP_URL = 'https://map.ukrainealarm.com/';
const WATER_URL = 'https://www.rubhoz.com/river/74/136';
const FISHING_URL = 'https://www.rubhoz.com/ua/prognoz-kleva-chernigiv';
const ALERT_REGION = 'Чернігівська область';
const execFileAsync = promisify(execFile);

function cleanText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function stripHtml(html) {
  return cleanText(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, '&')
  );
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0',
        accept: 'text/html,application/xhtml+xml,application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return response.text();
  } catch (error) {
    const { stdout } = await execFileAsync(
      'curl',
      ['-L', '-A', 'Mozilla/5.0', '-H', 'Accept: text/html,application/xhtml+xml,application/json', url],
      { maxBuffer: 8 * 1024 * 1024 }
    );

    if (!stdout) {
      throw error;
    }

    return stdout;
  }
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0',
        accept: 'application/json,text/plain,*/*'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return response.json();
  } catch (error) {
    const { stdout } = await execFileAsync(
      'curl',
      ['-L', '-A', 'Mozilla/5.0', '-H', 'Accept: application/json,text/plain,*/*', url],
      { maxBuffer: 8 * 1024 * 1024 }
    );

    if (!stdout) {
      throw error;
    }

    return JSON.parse(stdout);
  }
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function hiddenCard(status, meta, sourceUrl) {
  return {
    visible: false,
    status,
    meta,
    sourceUrl
  };
}

function visibleCard(status, meta, sourceUrl) {
  return {
    visible: true,
    status,
    meta,
    sourceUrl
  };
}

function parsePower(html) {
  const text = stripHtml(html);

  if (/Графік відключень на обрану дату ще не опублікований/i.test(text)) {
    return hiddenCard(
      'На сьогодні графік не опублікований',
      'Для черги 3.1 на поточну дату відкритого графіка ще немає.',
      POWER_URL
    );
  }

  if (/відключень не буде|без відключень|відключення не застосовуються/i.test(text)) {
    return hiddenCard(
      'На сьогодні відключень не заявлено',
      'Відкрите джерело не показує активного графіка для черги 3.1.',
      POWER_URL
    );
  }

  const intervals = dedupe([
    ...(text.match(/з\s*\d{1,2}:\d{2}\s*до\s*\d{1,2}:\d{2}/gi) || []).map((value) => value.replace(/\s+/g, ' ')),
    ...(text.match(/\b\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}\b/g) || []).map((value) => value.replace(/\s+/g, ' '))
  ]);

  if (!intervals.length) {
    return hiddenCard(
      'Немає актуального графіка',
      'Відкрите джерело не віддало інтервали для поточної дати.',
      POWER_URL
    );
  }

  return visibleCard(
    `Планові відключення: ${intervals.join(', ')}`,
    'Черга 3.1, Чернігівська область. Дані з відкритого щоденного графіка.',
    POWER_URL
  );
}

function parseAlert(data) {
  const region = data && data.states ? data.states[ALERT_REGION] : null;
  const cacheAt = data && data.cachedat ? data.cachedat : '';

  if (!region) {
    throw new Error(`Region not found in alert feed: ${ALERT_REGION}`);
  }

  const changedLabel = region.changed ? `Остання зміна: ${region.changed}.` : '';
  const cacheLabel = cacheAt ? ` Оновлено у джерелі: ${cacheAt}.` : '';

  if (region.alertnow) {
    return visibleCard(
      'Повітряна тривога оголошена',
      `Чернігівська область, орієнтир для с. Жавинка. ${changedLabel}${cacheLabel}`.trim(),
      ALERT_MAP_URL
    );
  }

  return visibleCard(
    'Повітряної тривоги немає',
    `Чернігівська область, орієнтир для с. Жавинка. ${changedLabel}${cacheLabel}`.trim(),
    ALERT_MAP_URL
  );
}

function parseWater(html) {
  const text = stripHtml(html);
  const row = text.match(/Уровень воды в Десне - Чернигов\s+(\d{1,2}\.\d{2}\.\d{4})\s+(\d+)\s*см\s*([-+]?\s*\d+)\s*см/i);

  if (!row) {
    throw new Error('Water parser did not find Desna row.');
  }

  const delta = row[3].replace(/\s+/g, '');
  const deltaText = delta.startsWith('-') ? `${delta} см за добу` : `+${delta.replace('+', '')} см за добу`;

  return visibleCard(
    `${row[1]}: ${row[2]} см`,
    `Чернігів, Десна. Зміна рівня: ${deltaText}.`,
    WATER_URL
  );
}

function scoreLabel(score) {
  if (score >= 7) return 'добрий';
  if (score >= 5) return 'середній';
  if (score >= 3) return 'помірний';
  return 'слабкий';
}

function parseFishing(html) {
  const text = stripHtml(html);
  const today = text.match(/сегодня\s+(\d{1,2}\.\d{2}'\d{2})\s+\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\s+([+-]?\d+\s*°)(?:\s+[+-]?\d+\s*°)?\s+(\d+)\s*mmHg\s+(\d+)\s*m\/s\s+([^\s]+)\s+(\d+)\s*\/\s*10\s+прогноз клева/i);
  const tomorrow = text.match(/завтра\s+(\d{1,2}\.\d{2}'\d{2})\s+\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\s+([+-]?\d+\s*°)(?:\s+([+-]?\d+\s*°))?\s+(\d+)\s*mmHg\s+(\d+)\s*m\/s\s+([^\s]+)\s+(\d+)\s*\/\s*10\s+прогноз клева/i);

  if (!today) {
    throw new Error('Fishing parser did not find today row.');
  }

  const todayScore = Number(today[6]);
  const tomorrowScore = tomorrow ? Number(tomorrow[7]) : null;
  const tomorrowText = tomorrow
    ? ` Завтра: ${tomorrow[1]}, ${tomorrowScore}/10, ${scoreLabel(tomorrowScore)}, вітер ${tomorrow[5]} м/с ${tomorrow[6]}.`
    : '';

  return visibleCard(
    `Сьогодні: ${todayScore}/10, ${scoreLabel(todayScore)} кльов`,
    `Сьогодні у Чернігові: ${today[1]}, температура ${today[2]}, тиск ${today[3]} мм рт. ст., вітер ${today[4]} м/с ${today[5]}.${tomorrowText}`.trim(),
    FISHING_URL
  );
}

async function updateSource(key, url, loader, parser, fallback, debug) {
  const sourceDebug = {
    key,
    url,
    fetchedAt: new Date().toISOString(),
    ok: false
  };

  try {
    const raw = await loader(url);
    sourceDebug.preview = typeof raw === 'string'
      ? stripHtml(raw).slice(0, 500)
      : JSON.stringify(raw).slice(0, 500);
    const parsed = parser(raw);
    sourceDebug.ok = true;
    sourceDebug.visible = parsed.visible !== false;
    debug.sources[key] = sourceDebug;
    return parsed;
  } catch (error) {
    sourceDebug.error = String(error);
    debug.sources[key] = sourceDebug;
    return fallback;
  }
}

async function main() {
  const debug = {
    updatedAt: new Date().toISOString(),
    sources: {}
  };

  const power = await updateSource(
    'power',
    POWER_URL,
    fetchText,
    parsePower,
    hiddenCard('Немає актуального графіка', 'Не вдалося отримати дані з джерела графіка.', POWER_URL),
    debug
  );

  const alert = await updateSource(
    'alert',
    ALERT_URL,
    fetchJson,
    parseAlert,
    hiddenCard('Статус тривоги недоступний', 'Не вдалося отримати актуальний статус тривоги.', ALERT_MAP_URL),
    debug
  );

  const water = await updateSource(
    'water',
    WATER_URL,
    fetchText,
    parseWater,
    hiddenCard('Рівень води недоступний', 'Не вдалося отримати дані по Десні.', WATER_URL),
    debug
  );

  const fishing = await updateSource(
    'fishing',
    FISHING_URL,
    fetchText,
    parseFishing,
    hiddenCard('Прогноз рибалки недоступний', 'Не вдалося отримати прогноз кльову.', FISHING_URL),
    debug
  );

  const payload = {
    updatedAt: debug.updatedAt,
    power,
    alert,
    water,
    fishing
  };

  await mkdir('data', { recursive: true });
  await writeFile('data/live-status.json', JSON.stringify(payload, null, 2) + '\n', 'utf8');
  await writeFile('data/live-status-log.json', JSON.stringify(debug, null, 2) + '\n', 'utf8');
}

main().catch(async (error) => {
  const fatal = {
    updatedAt: new Date().toISOString(),
    fatalError: String(error)
  };

  await mkdir('data', { recursive: true });
  await writeFile('data/live-status-log.json', JSON.stringify(fatal, null, 2) + '\n', 'utf8');
  console.error(error);
  process.exit(1);
});
