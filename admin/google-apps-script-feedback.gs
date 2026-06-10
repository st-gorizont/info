const SCRIPT_PROPS = PropertiesService.getScriptProperties();
const DEFAULT_SITE_SPREADSHEET_ID = '14VoX10DazCDKpLNIoK6O5iVZqWL1mmuR5l2ZybeXx0A';
const SHEET_HEADERS = [
  'created_at',
  'form_type',
  'name',
  'plot',
  'phone',
  'message',
  'source',
  'submitted_at',
  'client_started_at',
  'user_agent',
  'ip'
];
const UA_PHONE_PATTERN = /^\+380(39|50|63|66|67|68|73|89|91|92|93|94|95|96|97|98|99)\d{7}$/;

function doGet(e) {
  const action = e && e.parameter ? String(e.parameter.action || '').trim() : '';

  if (action === 'siteData') {
    return siteDataResponse_(e);
  }

  return htmlResponse_(true, 'ready', '');
}

function doOptions() {
  return htmlResponse_(true, 'ready', '');
}

function doPost(e) {
  let payload = { requestId: '' };

  try {
    payload = parsePayload_(e);
    validatePayload_(payload);
    guardSpam_(payload);

    const row = [
      new Date(),
      payload.formType || 'feedback',
      payload.name,
      payload.plot,
      payload.phone,
      payload.message,
      payload.source || '',
      payload.submittedAt || '',
      payload.clientStartedAt || '',
      payload.userAgent || '',
      payload.ip || ''
    ];

    appendRow_(row);
    notifyTelegram_(payload);

    return htmlResponse_(true, 'Повідомлення успішно відправлено.', payload.requestId);
  } catch (error) {
    logError_(error);
    return htmlResponse_(
      false,
      String(error && error.message ? error.message : error),
      payload && payload.requestId ? payload.requestId : ''
    );
  }
}

function parsePayload_(e) {
  const data = parseIncomingData_(e);

  return {
    formType: String(data.formType || 'feedback').trim(),
    name: String(data.name || '').trim(),
    plot: String(data.plot || '').trim(),
    phone: String(data.phone || '').trim(),
    message: String(data.message || '').trim(),
    company: String(data.company || '').trim(),
    source: String(data.source || '').trim(),
    submittedAt: String(data.submittedAt || '').trim(),
    clientStartedAt: String(data.clientStartedAt || '').trim(),
    userAgent: String(data.userAgent || '').trim(),
    ip: String(data.ip || '').trim(),
    requestId: String(data.requestId || '').trim()
  };
}

function parseIncomingData_(e) {
  if (e && e.parameter && Object.keys(e.parameter).length) {
    return e.parameter;
  }

  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  return JSON.parse(raw);
}

function validatePayload_(payload) {
  if (!payload.name || !payload.plot || !payload.phone || !payload.message) {
    throw new Error('Заповнені не всі обовʼязкові поля.');
  }

  if (!UA_PHONE_PATTERN.test(payload.phone)) {
    throw new Error('Телефон має бути у форматі +380671234567 з коректним українським кодом оператора.');
  }

  if (payload.name.length > 120 || payload.plot.length > 80 || payload.phone.length > 50 || payload.message.length > 5000) {
    throw new Error('Звернення перевищує допустимий розмір.');
  }
}

function siteDataResponse_(e) {
  const callback = e && e.parameter ? String(e.parameter.callback || '').trim() : '';
  const siteData = buildSiteData_();
  const payload = JSON.stringify(siteData);

  if (callback && /^[A-Za-z0-9_.$]+$/.test(callback)) {
    return ContentService
      .createTextOutput(`${callback}(${payload});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

function buildSiteData_() {
  const spreadsheetId = SCRIPT_PROPS.getProperty('SITE_SPREADSHEET_ID') || DEFAULT_SITE_SPREADSHEET_ID;
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

  return {
    texts: toTextBlocks_(readRows_(spreadsheet, 'Тексти')),
    heroFacts: sortRows_(readRows_(spreadsheet, 'Оперативно')),
    serviceCards: sortRows_(readRows_(spreadsheet, 'Картки')),
    wateringCards: sortRows_(readRows_(spreadsheet, 'Полив')),
    bus: sortRows_(readRows_(spreadsheet, 'Автобус')),
    rates: sortRows_(readRows_(spreadsheet, 'Тарифи').filter((row) => row.type === 'тариф')),
    paymentDetails: sortRows_(readRows_(spreadsheet, 'Реквізити')),
    news: sortRows_(readRows_(spreadsheet, 'Новини').filter((row) => String(row.active).toUpperCase() !== 'FALSE'))
  };
}

function readRows_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    return [];
  }

  const values = sheet.getDataRange().getDisplayValues();
  if (!values || values.length < 2) {
    return [];
  }

  const headers = values[0].map((header) => String(header || '').trim());
  return values.slice(1)
    .filter((row) => row.some((cell) => String(cell || '').trim() !== ''))
    .map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = String(row[index] || '').trim();
      });
      return item;
    });
}

function toTextBlocks_(rows) {
  return rows.reduce((acc, row) => {
    const section = row.section || '';
    const key = row.key || '';
    if (!section || !key) {
      return acc;
    }

    if (!acc[section]) {
      acc[section] = {};
    }

    acc[section][key] = row.value || '';
    return acc;
  }, {});
}

function sortRows_(rows) {
  return rows.slice().sort((left, right) => Number(left.sort || 0) - Number(right.sort || 0));
}

function guardSpam_(payload) {
  if (payload.company) {
    throw new Error('Spam detected.');
  }

  if (payload.clientStartedAt) {
    const startedAt = new Date(payload.clientStartedAt).getTime();
    const submittedAt = payload.submittedAt ? new Date(payload.submittedAt).getTime() : Date.now();

    if (Number.isFinite(startedAt) && Number.isFinite(submittedAt)) {
      const elapsedMs = submittedAt - startedAt;
      if (elapsedMs >= 0 && elapsedMs < 3000) {
        throw new Error('Форму надіслано занадто швидко.');
      }
    }
  }

  const lockKey = `rate:${payload.phone}:${payload.plot}`;
  const cache = CacheService.getScriptCache();
  if (cache.get(lockKey)) {
    throw new Error('Повторне надсилання тимчасово обмежене. Спробуйте трохи пізніше.');
  }
  cache.put(lockKey, '1', 60);
}

function appendRow_(row) {
  const spreadsheetId = SCRIPT_PROPS.getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('Не задано SPREADSHEET_ID у Script Properties.');
  }

  const sheetName = SCRIPT_PROPS.getProperty('SHEET_NAME') || 'Feedback';
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SHEET_HEADERS);
  }

  sheet.appendRow(row);
}

function notifyTelegram_(payload) {
  const token = SCRIPT_PROPS.getProperty('TELEGRAM_BOT_TOKEN');
  const targetsRaw = SCRIPT_PROPS.getProperty('TELEGRAM_TARGETS');

  if (!token || !targetsRaw) {
    throw new Error('Не задано TELEGRAM_BOT_TOKEN або TELEGRAM_TARGETS у Script Properties.');
  }

  const text = [
    'Нове звернення із сайту СТ «Горизонт»',
    '',
    `Імʼя: ${payload.name}`,
    `№ ділянки: ${payload.plot}`,
    `Телефон: ${payload.phone}`,
    '',
    'Повідомлення:',
    payload.message,
    '',
    `Дата: ${payload.submittedAt || new Date().toISOString()}`
  ].join('\n');

  const targets = targetsRaw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  targets.forEach((chatId) => {
    const response = UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({
        chat_id: chatId,
        text
      })
    });

    if (response.getResponseCode() >= 300) {
      throw new Error(`Telegram send failed for ${chatId}: ${response.getContentText()}`);
    }
  });
}

function htmlResponse_(ok, message, requestId) {
  const payload = {
    source: 'st-gorizont-feedback',
    ok: ok,
    message: message,
    requestId: requestId || ''
  };

  const html = `<!DOCTYPE html>
<html lang="uk">
  <head>
    <meta charset="utf-8">
    <title>Feedback Response</title>
  </head>
  <body>
    <script>
      (function () {
        var payload = ${JSON.stringify(payload)};
        if (window.parent) {
          window.parent.postMessage(payload, '*');
        }
      })();
    </script>
  </body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function logError_(error) {
  console.error(error);
}
