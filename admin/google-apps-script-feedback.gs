const SCRIPT_PROPS = PropertiesService.getScriptProperties();
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

function doOptions() {
  return jsonResponse({ ok: true });
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
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

    return jsonResponse({ ok: true, message: 'accepted' });
  } catch (error) {
    logError_(error);
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) }, 400);
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
    ip: String(data.ip || '').trim()
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

  if (payload.name.length > 120 || payload.plot.length > 80 || payload.phone.length > 50 || payload.message.length > 5000) {
    throw new Error('Звернення перевищує допустимий розмір.');
  }
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

function jsonResponse(payload, statusCode) {
  const output = ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);

  return output;
}

function logError_(error) {
  console.error(error);
}
