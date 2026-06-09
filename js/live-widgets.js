(function () {
  var POWER_URL = 'https://chernigiv.energy-ua.info/cherga/3-1';
  var POWER_PROXY_URL = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(POWER_URL);
  var WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=51.4478&longitude=31.25672&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FKyiv&forecast_days=7';

  var weatherCodes = {
    0: 'Ясно',
    1: 'Переважно ясно',
    2: 'Мінлива хмарність',
    3: 'Хмарно',
    45: 'Туман',
    48: 'Паморозь',
    51: 'Слабка мряка',
    53: 'Мряка',
    55: 'Сильна мряка',
    61: 'Невеликий дощ',
    63: 'Дощ',
    65: 'Сильний дощ',
    71: 'Слабкий сніг',
    73: 'Сніг',
    75: 'Сильний сніг',
    80: 'Короткочасний дощ',
    81: 'Дощові заряди',
    82: 'Сильні зливи',
    95: 'Гроза',
    96: 'Гроза з градом',
    99: 'Сильна гроза з градом'
  };

  var dayNames = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    var node = byId(id);
    if (node) {
      node.textContent = text;
    }
  }

  function weatherLabel(code) {
    return weatherCodes.hasOwnProperty(code) ? weatherCodes[code] : 'Без уточнення';
  }

  function formatDay(dateString) {
    var date = new Date(dateString + 'T12:00:00');
    return dayNames[date.getDay()] + ', ' + String(date.getDate()).padStart(2, '0') + '.' + String(date.getMonth() + 1).padStart(2, '0');
  }

  async function fetchText(url) {
    var response = await fetch(url, { headers: { Accept: 'text/html,application/json;q=0.9,*/*;q=0.8' } });
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    return response.text();
  }

  function extractPowerStatus(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var text = (doc.body ? doc.body.textContent : html).replace(/\s+/g, ' ').trim();
    var queueMatch = text.match(/У вас\s+([^.]*)/i);
    var dateMatch = text.match(/(\d+\s+черга\s*\(\d+\s+підгрупа\)\s*[A-ЯІЇЄа-яіїє.\s]+\d{2}\.\d{2}\.\d{4})/);
    var todayBlock = '';
    var todayStart = text.indexOf('Періоди відключень на сьогодні');
    var tomorrowStart = text.indexOf('Періоди відключень на завтра');

    if (todayStart !== -1) {
      todayBlock = text.slice(todayStart, tomorrowStart !== -1 ? tomorrowStart : undefined);
    }

    var outageRanges = todayBlock.match(/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/g);
    var hasNoData = /Немає даних/i.test(todayBlock);
    var warningMatch = text.match(/Увага![^.]*\./i);

    if (outageRanges && outageRanges.length) {
      return {
        status: 'Планові відключення сьогодні: ' + outageRanges.join(', '),
        meta: [
          queueMatch ? queueMatch[0] : '',
          dateMatch ? dateMatch[1] : '',
          warningMatch ? warningMatch[0] : ''
        ].filter(Boolean).join(' ')
      };
    }

    if (hasNoData) {
      return {
        status: 'На сьогодні для 3.1 черги планові періоди не вказані',
        meta: [
          queueMatch ? queueMatch[0] : '',
          dateMatch ? dateMatch[1] : '',
          warningMatch ? warningMatch[0] : 'Можливі аварійні або превентивні відключення без окремого графіка.'
        ].filter(Boolean).join(' ')
      };
    }

    return {
      status: 'Не вдалося точно зчитати графік відключень',
      meta: 'Відкрийте джерело нижче, щоб переглянути актуальний статус для черги 3.1.'
    };
  }

  async function loadPowerStatus() {
    try {
      var html;
      try {
        html = await fetchText(POWER_PROXY_URL);
      } catch (proxyError) {
        html = await fetchText(POWER_URL);
      }

      var result = extractPowerStatus(html);
      setText('powerStatusText', result.status);
      setText('powerStatusMeta', result.meta);
    } catch (error) {
      setText('powerStatusText', 'Не вдалося оновити графік автоматично');
      setText('powerStatusMeta', 'Спробуйте відкрити повне джерело: chernigiv.energy-ua.info.');
    }
  }

  async function loadWeather() {
    var daysNode = byId('weatherDays');
    if (!daysNode) {
      return;
    }

    try {
      var response = await fetch(WEATHER_URL, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      var data = await response.json();
      var current = data.current || {};
      var daily = data.daily || {};
      var dates = daily.time || [];
      var maxTemps = daily.temperature_2m_max || [];
      var minTemps = daily.temperature_2m_min || [];
      var precip = daily.precipitation_probability_max || [];
      var codes = daily.weather_code || [];

      if (!dates.length) {
        throw new Error('Missing daily forecast');
      }

      setText(
        'weatherToday',
        'Зараз ' + Math.round(current.temperature_2m) + '°C, ' + weatherLabel(current.weather_code)
      );
      setText(
        'weatherMeta',
        'Сьогодні: від ' + Math.round(minTemps[0]) + '°C до ' + Math.round(maxTemps[0]) + '°C. Вітер ' +
          Math.round(current.wind_speed_10m || 0) + ' км/год.'
      );

      daysNode.innerHTML = dates.map(function (date, index) {
        return (
          '<article class="weather-day">' +
            '<strong>' + formatDay(date) + '</strong>' +
            '<span>' + weatherLabel(codes[index]) + '</span>' +
            '<span>' + Math.round(minTemps[index]) + '°C ... ' + Math.round(maxTemps[index]) + '°C</span>' +
            '<span>Опади: ' + Math.round(precip[index] || 0) + '%</span>' +
          '</article>'
        );
      }).join('');
    } catch (error) {
      setText('weatherToday', 'Не вдалося завантажити прогноз погоди');
      setText('weatherMeta', 'Перевірте підключення або оновіть сторінку пізніше.');
      daysNode.innerHTML = '';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadPowerStatus();
    loadWeather();
  });
})();
