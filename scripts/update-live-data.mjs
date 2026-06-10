import { writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const POWER_URL = 'https://chernigiv.energy-ua.info/cherga/3-1';
const ALERT_URL = 'https://alarmmap.online/ua/atu/chernigivska-oblast/chernigivskij-rayon/air';
const WATER_URL = 'https://www.rubhoz.com/river/74/136';
const FISHING_URL = 'https://www.rubhoz.com/ua/prognoz-kleva-chernigiv';
const ALERT_REGION_CODE = 'UA74100000000047140';

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function stripHtml(html) {
  return cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
  );
}

function challengeBlocked(html) {
  return /Just a moment|Enable JavaScript and cookies to continue|__cf_chl_/i.test(html);
}

async function fetchWithNode(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
      accept: 'text/html,application/xhtml+xml'
    }
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const utf8 = new TextDecoder('utf-8').decode(buffer);

  return {
    ok: response.ok && !challengeBlocked(utf8),
    status: response.status,
    text: utf8,
    blocked: challengeBlocked(utf8)
  };
}

async function fetchWithCurl(url) {
  const { stdout } = await execFileAsync(
    'curl',
    ['-L', '-A', 'Mozilla/5.0', '-H', 'Accept: text/html,application/xhtml+xml', url],
    { maxBuffer: 8 * 1024 * 1024 }
  );

  return {
    ok: !challengeBlocked(stdout),
    status: null,
    text: stdout,
    blocked: challengeBlocked(stdout)
  };
}

async function fetchWithPlaywright(url) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0'
    });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(12000);
    const html = await page.content();
    return {
      ok: !challengeBlocked(html),
      status: 200,
      text: html,
      blocked: challengeBlocked(html)
    };
  } finally {
    await browser.close();
  }
}

async function fetchPowerHtml(debug) {
  try {
    const byFetch = await fetchWithNode(POWER_URL);
    debug.steps.push({
      method: 'fetch',
      ok: byFetch.ok,
      status: byFetch.status,
      blocked: byFetch.blocked
    });
    if (byFetch.ok) {
      return byFetch.text;
    }
  } catch (error) {
    debug.steps.push({ method: 'fetch', ok: false, error: String(error) });
  }

  try {
    const byCurl = await fetchWithCurl(POWER_URL);
    debug.steps.push({
      method: 'curl',
      ok: byCurl.ok,
      status: byCurl.status,
      blocked: byCurl.blocked
    });
    if (byCurl.ok) {
      return byCurl.text;
    }
  } catch (error) {
    debug.steps.push({ method: 'curl', ok: false, error: String(error) });
  }

  try {
    const byPlaywright = await fetchWithPlaywright(POWER_URL);
    debug.steps.push({
      method: 'playwright',
      ok: byPlaywright.ok,
      status: byPlaywright.status,
      blocked: byPlaywright.blocked
    });
    if (byPlaywright.ok) {
      return byPlaywright.text;
    }
  } catch (error) {
    debug.steps.push({ method: 'playwright', ok: false, error: String(error) });
  }

  throw new Error('Power source blocked by Cloudflare for fetch/curl/playwright.');
}

function parsePower(html) {
  const text = stripHtml(html);
  const queue = text.match(/У вас\s+([^!]+)!/i);
  const warning = text.match(/УВАГА![^.]*\./i);
  const periodsBlock = text.match(/Періоди відключень на сьогодні(.*?)Позначення до графіка/i);
  const periods = periodsBlock ? periodsBlock[1].match(/З\s+\d{2}:\d{2}\s+до\s+\d{2}:\d{2}/g) : null;

  if (periods && periods.length) {
    return {
      status: `Планові відключення сьогодні: ${periods.join(', ')}`,
      meta: `${queue ? queue[0].replace(/\s+/g, ' ').trim() : 'Черга 3.1.'} ${warning ? warning[0] : ''}`.trim(),
      sourceUrl: POWER_URL
    };
  }

  if (/Періоди відключень на сьогодні\s+Немає даних/i.test(text)) {
    return {
      status: 'На сьогодні планові відключення не вказані',
      meta: `${queue ? queue[0].replace(/\s+/g, ' ').trim() : 'Черга 3.1, Чернігівська область.'} ${warning ? warning[0] : ''}`.trim(),
      sourceUrl: POWER_URL
    };
  }

  throw new Error('Power parser did not find schedule markers.');
}

function parseAlert(html) {
  const text = stripHtml(html);
  const cacheMatch = html.match(new RegExp(`"api:\\/atu\\/${ALERT_REGION_CODE}\\/incidents\\?start=[^"]+air":\\{"data":\\{"total":(\\d+),"emergencies":\\[(.*?)\\]\\},"ts":`, 's'));
  const activeMatch = cacheMatch ? cacheMatch[2].match(/"start":"([^"]+)","end":null/) : null;

  if (activeMatch) {
    const startDate = new Date(activeMatch[1]);
    return {
      status: 'Повітряна тривога оголошена',
      meta: `Чернігівський район. Початок: ${startDate.toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' })}. Для с. Жавинка орієнтуйтесь саме на цей статус.`,
      sourceUrl: ALERT_URL
    };
  }

  if (/Повідомлень, які б стосувалися повітряної тривоги[^.]*зараз не фіксується/i.test(text) || /Тривають\s+зараз\s+0/i.test(text)) {
    return {
      status: 'Зараз повітряна тривога не оголошена',
      meta: 'Чернігівський район. Дані оновлюються з alarmmap.online.',
      sourceUrl: ALERT_URL
    };
  }

  throw new Error('Alert parser did not find active or inactive status markers.');
}

function parseWater(html) {
  const text = stripHtml(html);
  const row = text.match(/Уровень воды в Десне - Чернигов\s+(\d{1,2}\.\d{2}\.\d{4})\s+(\d+)\s*см\s*([-+]?\s*\d+)\s*см/i);

  if (!row) {
    throw new Error('Water parser did not find Desna level row.');
  }

  const delta = row[3].replace(/\s+/g, '');
  const changeLabel = delta.startsWith('-') ? `${delta} см за добу` : `+${delta.replace('+', '')} см за добу`;

  return {
    status: `${row[1]}: ${row[2]} см`,
    meta: `Чернігів, Десна. Зміна рівня: ${changeLabel}.`,
    sourceUrl: WATER_URL
  };
}

function scoreLabel(score) {
  if (score >= 7) return 'добрий';
  if (score >= 5) return 'середній';
  if (score >= 3) return 'помірний';
  return 'слабкий';
}

function parseFishing(html) {
  const text = stripHtml(html);
  const today = text.match(/сегодня\s+(\d{1,2}\.\d{2}'\d{2})\s+\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\s+([+-]?\d+\s*°)\s+(\d+)\s*mmHg\s+(\d+)\s*m\/s\s+([А-Яа-яA-Za-z-]+)\s+(\d+)\s*\/10\s+прогноз клева/i);
  const tomorrow = text.match(/завтра\s+(\d{1,2}\.\d{2}'\d{2})\s+\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\s+([+-]?\d+\s*°)\s+([+-]?\d+\s*°)\s+(\d+)\s*mmHg\s+(\d+)\s*m\/s\s+([А-Яа-яA-Za-z-]+)\s+(\d+)\s*\/10\s+прогноз клева/i);
  const todayDetails = text.match(/Прогноз клёва Чернигов сегодня - .*? Сегодня\s+([^.]*)\.\s+Температура утром\s+([^,]+),\s*днём и вечером\s+([^.]*)\.\s+Давление[^.]*?(\d+)\s*мм\.рт\.ст\.\s+Ветер[^.]*?до\s+(\d+)\s*м\/с/i);

  if (!today) {
    throw new Error('Fishing parser did not find today score row.');
  }

  const todayScore = Number(today[6]);
  const tomorrowScore = tomorrow ? Number(tomorrow[7]) : null;
  const todayMeta = todayDetails
    ? `Сьогодні ${todayDetails[1].toLowerCase()}. Температура: ранок ${todayDetails[2].trim()}, день/вечір ${todayDetails[3].trim()}. Тиск ${todayDetails[4]} мм рт. ст., вітер до ${todayDetails[5]} м/с.`
    : `Сьогодні: температура ${today[2]}, вітер ${today[4]} м/с ${today[5]}.`;
  const tomorrowMeta = tomorrow
    ? ` Завтра: ${tomorrow[1]}, ${tomorrow[7]}/10, ${scoreLabel(tomorrowScore)}, вітер ${tomorrow[5]} м/с ${tomorrow[6]}.`
    : '';

  return {
    status: `Сьогодні: ${todayScore}/10, ${scoreLabel(todayScore)} кльов`,
    meta: `${todayMeta}${tomorrowMeta}`.trim(),
    sourceUrl: FISHING_URL
  };
}

function fallbackCard(title, meta, sourceUrl) {
  return { status: title, meta, sourceUrl };
}

async function updateSource({ key, url, fetcher, parser, fallback }, debug) {
  const sourceDebug = {
    key,
    url,
    ok: false,
    fetchedAt: new Date().toISOString(),
    steps: []
  };

  try {
    const html = await fetcher(sourceDebug);
    sourceDebug.htmlPreview = stripHtml(html).slice(0, 500);
    const parsed = parser(html);
    sourceDebug.ok = true;
    sourceDebug.parsed = parsed;
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

  const power = await updateSource({
    key: 'power',
    url: POWER_URL,
    fetcher: fetchPowerHtml,
    parser: parsePower,
    fallback: fallbackCard(
      'Графік тимчасово недоступний',
      'Спробуйте відкрити офіційне джерело нижче.',
      POWER_URL
    )
  }, debug);

  const alert = await updateSource({
    key: 'alert',
    url: ALERT_URL,
    fetcher: async (sourceDebug) => {
      const result = await fetchWithNode(ALERT_URL);
      sourceDebug.steps = [{ method: 'fetch', ok: result.ok, status: result.status, blocked: result.blocked }];
      if (!result.ok) {
        throw new Error(`Alert fetch failed: HTTP ${result.status}, blocked=${result.blocked}`);
      }
      return result.text;
    },
    parser: parseAlert,
    fallback: fallbackCard(
      'Статус тривоги тимчасово недоступний',
      'Спробуйте оновити сторінку трохи пізніше.',
      ALERT_URL
    )
  }, debug);

  const water = await updateSource({
    key: 'water',
    url: WATER_URL,
    fetcher: async (sourceDebug) => {
      const result = await fetchWithNode(WATER_URL);
      sourceDebug.steps = [{ method: 'fetch', ok: result.ok, status: result.status, blocked: result.blocked }];
      if (!result.ok) {
        throw new Error(`Water fetch failed: HTTP ${result.status}, blocked=${result.blocked}`);
      }
      return result.text;
    },
    parser: parseWater,
    fallback: fallbackCard(
      'Дані про рівень води тимчасово недоступні',
      'Спробуйте оновити сторінку трохи пізніше.',
      WATER_URL
    )
  }, debug);

  const fishing = await updateSource({
    key: 'fishing',
    url: FISHING_URL,
    fetcher: async (sourceDebug) => {
      const result = await fetchWithNode(FISHING_URL);
      sourceDebug.steps = [{ method: 'fetch', ok: result.ok, status: result.status, blocked: result.blocked }];
      if (!result.ok) {
        throw new Error(`Fishing fetch failed: HTTP ${result.status}, blocked=${result.blocked}`);
      }
      return result.text;
    },
    parser: parseFishing,
    fallback: fallbackCard(
      'Прогноз для рибалки тимчасово недоступний',
      'Спробуйте оновити сторінку трохи пізніше.',
      FISHING_URL
    )
  }, debug);

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
