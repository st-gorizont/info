(function () {
  var LIVE_STATUS_URL = 'data/live-status.json';
  var FORM_CONFIG_URL = 'data/form-config.json';
  var FEEDBACK_CONFIG_URL = 'data/feedback-config.json';
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

  function setHref(id, href) {
    var node = byId(id);
    if (node && href) {
      node.href = href;
    }
  }

  function setOptionalText(id, text) {
    var node = byId(id);
    if (!node) {
      return;
    }

    if (text) {
      node.hidden = false;
      node.textContent = text;
    } else {
      node.hidden = true;
      node.textContent = '';
    }
  }

  function weatherLabel(code) {
    return Object.prototype.hasOwnProperty.call(weatherCodes, code)
      ? weatherCodes[code]
      : 'Без уточнення';
  }

  function formatDay(dateString) {
    var date = new Date(dateString + 'T12:00:00');
    return dayNames[date.getDay()] + ', ' + String(date.getDate()).padStart(2, '0') + '.' + String(date.getMonth() + 1).padStart(2, '0');
  }

  async function fetchJson(url) {
    var response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    return response.json();
  }

  function applyLiveStatus(data) {
    if (!data) {
      return;
    }

    if (data.power) {
      setText('powerStatusText', data.power.status || 'Немає даних');
      setText('powerStatusMeta', data.power.meta || 'Дані тимчасово недоступні.');
      setHref('powerStatusLink', data.power.sourceUrl);
    }

    if (data.alert) {
      setText('alertStatusText', data.alert.status || 'Немає даних');
      setText('alertStatusMeta', data.alert.meta || 'Дані тимчасово недоступні.');
      setHref('alertStatusLink', data.alert.sourceUrl);
    }

    if (data.water) {
      setText('waterLevelText', data.water.status || 'Немає даних');
      setText('waterLevelMeta', data.water.meta || 'Дані тимчасово недоступні.');
      setHref('waterLevelLink', data.water.sourceUrl);
    }

    if (data.fishing) {
      setText('fishingForecastText', data.fishing.status || 'Немає даних');
      setText('fishingForecastMeta', data.fishing.meta || 'Дані тимчасово недоступні.');
      setHref('fishingForecastLink', data.fishing.sourceUrl);
    }
  }

  async function loadLiveStatus() {
    try {
      var data = await fetchJson(LIVE_STATUS_URL);
      applyLiveStatus(data);
    } catch (error) {
      setText('powerStatusText', 'Немає локальних даних про відключення');
      setText('powerStatusMeta', 'Оновлення блоку буде працювати після публікації JSON у репозиторії.');
      setText('alertStatusText', 'Немає локальних даних про тривогу');
      setText('alertStatusMeta', 'Оновлення блоку буде працювати після публікації JSON у репозиторії.');
      setText('waterLevelText', 'Немає локальних даних про рівень води');
      setText('waterLevelMeta', 'Оновлення блоку буде працювати після публікації JSON у репозиторії.');
      setText('fishingForecastText', 'Немає локальних даних про прогноз рибалки');
      setText('fishingForecastMeta', 'Оновлення блоку буде працювати після публікації JSON у репозиторії.');
    }
  }

  async function loadFormConfig() {
    var button = byId('meterFormButton');
    var hint = byId('meterFormHint');

    if (!button || !hint) {
      return;
    }

    try {
      var config = await fetchJson(FORM_CONFIG_URL);

      if (config.formUrl) {
        button.href = config.formUrl;
        button.removeAttribute('aria-disabled');
        hint.textContent = config.hint || 'Форма готова до заповнення мешканцями.';
        return;
      }
    } catch (error) {
      // Fall through to disabled state below.
    }

    button.href = '#meter';
    button.setAttribute('aria-disabled', 'true');
    hint.textContent = 'Публічне посилання на Google-форму ще не підключено.';
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

  async function loadFeedbackConfig() {
    var form = byId('feedbackForm');
    var submit = byId('feedbackSubmit');
    var note = byId('feedbackFormNote');
    var status = byId('feedbackStatusHint');

    if (!form || !submit || !note || !status) {
      return;
    }

    var webhookUrl = '';

    try {
      var config = await fetchJson(FEEDBACK_CONFIG_URL);
      webhookUrl = config.webhookUrl || '';
      setOptionalText('feedbackFormNote', config.hint || '');
      setOptionalText('feedbackStatusHint', config.statusText || '');
    } catch (error) {
      setOptionalText('feedbackFormNote', '');
      setOptionalText('feedbackStatusHint', '');
    }

    if (!webhookUrl) {
      submit.setAttribute('aria-disabled', 'true');
      submit.disabled = true;
      return;
    }

    submit.disabled = false;
    submit.removeAttribute('aria-disabled');

    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      var formData = new FormData(form);
      var payload = {
        name: String(formData.get('name') || '').trim(),
        plot: String(formData.get('plot') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        message: String(formData.get('message') || '').trim(),
        submittedAt: new Date().toISOString(),
        source: window.location.href
      };

      if (!payload.name || !payload.plot || !payload.phone || !payload.message) {
        note.hidden = false;
        note.textContent = 'Заповніть усі поля форми.';
        return;
      }

      submit.disabled = true;
      note.hidden = false;
      note.textContent = 'Надсилаємо повідомлення…';

      try {
        var response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }

        form.reset();
        note.hidden = false;
        note.textContent = 'Повідомлення успішно відправлено.';
      } catch (error) {
        note.hidden = false;
        note.textContent = 'Не вдалося відправити звернення. Спробуйте пізніше.';
      } finally {
        submit.disabled = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadLiveStatus();
    loadWeather();
    loadFormConfig();
    loadFeedbackConfig();
  });
})();
