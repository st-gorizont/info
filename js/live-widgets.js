(function () {
  var LIVE_STATUS_URL = 'data/live-status.json';
  var FORM_CONFIG_URL = 'data/form-config.json';
  var FEEDBACK_CONFIG_URL = 'data/feedback-config.json';
  var WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=51.4478&longitude=31.25672&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FKyiv&forecast_days=7&past_days=6';
  var FEEDBACK_MESSAGE_SOURCE = 'st-gorizont-feedback';
  var SITE_DATA_CALLBACK_PREFIX = '__stGorizontSiteData__';
  var NEWS_PREVIEW_LIMIT = 6;
  var siteConfig = {
    blocks: {},
    media: {}
  };

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
  var weekDayNames = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота'];

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    var node = byId(id);
    if (node && text !== undefined && text !== null && String(text).trim() !== '') {
      node.textContent = text;
    }
  }

  function setHref(id, href) {
    var node = byId(id);
    if (node && href) {
      node.href = href;
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildYoutubeEmbedUrl(rawUrl) {
    var value = String(rawUrl || '').trim();
    if (!value) {
      return '';
    }

    try {
      var url = new URL(value, window.location.href);
      var host = url.hostname.replace(/^www\./, '');
      var videoId = '';

      if (host === 'youtu.be') {
        videoId = url.pathname.replace(/\//g, '');
      } else if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (url.pathname === '/watch') {
          videoId = url.searchParams.get('v') || '';
        } else if (url.pathname.indexOf('/embed/') === 0) {
          videoId = url.pathname.split('/embed/')[1] || '';
        } else if (url.pathname.indexOf('/shorts/') === 0) {
          videoId = url.pathname.split('/shorts/')[1] || '';
        }
      }

      if (!videoId) {
        return value;
      }

      return 'https://www.youtube.com/embed/' + encodeURIComponent(videoId) +
        '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + encodeURIComponent(videoId) +
        '&playsinline=1&modestbranding=1&rel=0';
    } catch (error) {
      return value;
    }
  }

  function findOne(selector) {
    return document.querySelector(selector);
  }

  function setNodeText(selector, text) {
    var node = findOne(selector);
    if (node && text) {
      node.textContent = text;
    }
  }

  function normalizeUAPhone(rawValue) {
    var cleaned = String(rawValue || '').replace(/[^\d+]/g, '');

    if (cleaned.indexOf('380') === 0) {
      cleaned = '+' + cleaned;
    } else if (cleaned.indexOf('80') === 0) {
      cleaned = '+3' + cleaned;
    } else if (cleaned.indexOf('0') === 0) {
      cleaned = '+38' + cleaned;
    }

    return cleaned;
  }

  function isValidUAPhone(phone) {
    return /^\+380(39|50|63|66|67|68|73|89|91|92|93|94|95|96|97|98|99)\d{7}$/.test(phone);
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

  function setHidden(id, hidden) {
    var node = byId(id);
    if (node) {
      node.hidden = !!hidden;
    }
  }

  function isBlockEnabled(key) {
    if (!Object.prototype.hasOwnProperty.call(siteConfig.blocks, key)) {
      return true;
    }
    return siteConfig.blocks[key] !== false;
  }

  function parseBool(value, defaultValue) {
    var normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
      return defaultValue;
    }
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'так') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'ні') {
      return false;
    }
    return defaultValue;
  }

  function ensureFeedbackTransportFrame() {
    var frame = byId('feedbackTransportFrame');
    if (frame) {
      return frame;
    }

    frame = document.createElement('iframe');
    frame.id = 'feedbackTransportFrame';
    frame.name = 'feedbackTransportFrame';
    frame.hidden = true;
    frame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(frame);
    return frame;
  }

  function isTrustedFeedbackOrigin(origin) {
    try {
      var hostname = new URL(origin).hostname;
      return hostname === 'script.google.com' || hostname === 'script.googleusercontent.com';
    } catch (error) {
      return false;
    }
  }

  function submitAppsScriptForm(webhookUrl, payload) {
    return new Promise(function (resolve, reject) {
      var frame = ensureFeedbackTransportFrame();
      var requestId = 'feedback-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      var timeoutId = null;

      payload.requestId = requestId;

      function cleanup() {
        window.removeEventListener('message', onMessage);
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        if (transportForm.parentNode) {
          transportForm.parentNode.removeChild(transportForm);
        }
      }

      function onMessage(event) {
        var data = event.data || {};

        if (!isTrustedFeedbackOrigin(event.origin)) {
          return;
        }

        if (data.source !== FEEDBACK_MESSAGE_SOURCE || data.requestId !== requestId) {
          return;
        }

        cleanup();

        if (data.ok) {
          resolve(data);
        } else {
          reject(new Error(data.message || 'Не вдалося надіслати звернення.'));
        }
      }

      var transportForm = document.createElement('form');
      transportForm.method = 'POST';
      transportForm.action = webhookUrl;
      transportForm.target = frame.name;
      transportForm.hidden = true;

      Object.keys(payload).forEach(function (key) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = payload[key];
        transportForm.appendChild(input);
      });

      document.body.appendChild(transportForm);
      window.addEventListener('message', onMessage);

      timeoutId = window.setTimeout(function () {
        cleanup();
        reject(new Error('Час очікування відповіді вичерпано.'));
      }, 25000);

      transportForm.submit();
    });
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

  function formatWeekDay(dateString) {
    var date = new Date(dateString + 'T12:00:00');
    return weekDayNames[date.getDay()];
  }

  function formatShortDate(dateString) {
    var date = new Date(dateString + 'T12:00:00');
    return String(date.getDate()).padStart(2, '0') + '.' + String(date.getMonth() + 1).padStart(2, '0');
  }

  function toIsoDate(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  async function fetchJson(url) {
    var response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    return response.json();
  }

  function getTextBlock(siteData, section, key) {
    if (!siteData || !siteData.texts || !siteData.texts[section]) {
      return '';
    }
    return siteData.texts[section][key] || '';
  }

  function renderHeroFacts(items) {
    var node = byId('heroFactsList');
    if (!node || !items || !items.length) {
      return;
    }

    node.innerHTML = items.map(function (item) {
      return '<li>' + escapeHtml(item.text) + '</li>';
    }).join('');
  }

  function renderServiceCards(items) {
    var node = byId('serviceCardsGrid');
    if (!node || !items || !items.length) {
      return;
    }

    node.innerHTML = items.map(function (item) {
      return (
        '<a class="info-card" href="' + escapeHtml(item.anchor || '#') + '">' +
          '<span class="info-card__tag">' + escapeHtml(item.tag || '') + '</span>' +
          '<h3>' + escapeHtml(item.title || '') + '</h3>' +
          '<p>' + escapeHtml(item.text || '') + '</p>' +
        '</a>'
      );
    }).join('');
  }

  function renderWateringCards(items) {
    var node = byId('wateringCardsGrid');
    if (!node || !items || !items.length) {
      return;
    }

    node.innerHTML = items.map(function (item) {
      return (
        '<article class="detail-card">' +
          '<h3>' + escapeHtml(item.title || '') + '</h3>' +
          '<p><strong>' + escapeHtml(item.value || '') + '</strong></p>' +
        '</article>'
      );
    }).join('');
  }

  function renderBusData(items) {
    var tableNode = byId('busScheduleTable');
    var fareNode = byId('busFareItems');
    var introText = '';
    var fromLabel = 'Від «Дитячого світу»';
    var toLabel = 'Від дач';
    var fareTitle = 'Вартість проїзду';
    var note = '';
    var routes = [];
    var fares = [];

    if (!items || !items.length) {
      return;
    }

    items.forEach(function (item) {
      if (item.type === 'meta') {
        if (item.title === 'intro') introText = item.value;
        if (item.title === 'from_label') fromLabel = item.value;
        if (item.title === 'to_label') toLabel = item.value;
        if (item.title === 'fare_title') fareTitle = item.value;
        if (item.title === 'note') note = item.value;
      } else if (item.type === 'рейс') {
        routes.push(item);
      } else if (item.type === 'вартість') {
        fares.push(item);
      }
    });

    setText('busIntro', introText);
    setText('busFareTitle', fareTitle);
    setText('busScheduleNote', note);

    if (tableNode && routes.length) {
      tableNode.innerHTML =
        '<div class="schedule-table__head">' + escapeHtml(fromLabel) + '</div>' +
        '<div class="schedule-table__head">' + escapeHtml(toLabel) + '</div>' +
        routes.map(function (item) {
          return '<div>' + escapeHtml(item.title || '') + '</div><div>' + escapeHtml(item.value || '') + '</div>';
        }).join('');
    }

    if (fareNode && fares.length) {
      fareNode.innerHTML = fares.map(function (item) {
        return '<p><strong>' + escapeHtml(item.title || '') + '</strong> — ' + escapeHtml(item.value || '') + '</p>';
      }).join('');
    }
  }

  function renderRates(items) {
    var node = byId('ratesCardsGrid');
    if (!node || !items || !items.length) {
      return;
    }

    node.innerHTML = items.map(function (item) {
      return (
        '<article class="pricing-card">' +
          '<h3>' + escapeHtml(item.title || '') + '</h3>' +
          '<p class="price-value">' + escapeHtml(item.price || '') + '</p>' +
          '<p>' + escapeHtml(item.text || '') + '</p>' +
        '</article>'
      );
    }).join('');
  }

  function renderPaymentDetails(items) {
    var node = byId('paymentDetailsGrid');
    if (!node || !items || !items.length) {
      return;
    }

    node.innerHTML = items.map(function (item) {
      return '<p><strong>' + escapeHtml(item.label || '') + ':</strong> ' + escapeHtml(item.value || '') + '</p>';
    }).join('');
  }

  function renderNews(items) {
    var node = byId('newsGrid');
    var actions = byId('newsActions');
    var toggleButton = byId('newsToggleButton');
    var expanded = false;

    if (!node) {
      return;
    }

    if (!items || !items.length) {
      node.innerHTML = '';
      if (actions) actions.hidden = true;
      return;
    }

    function renderNewsItems() {
      var visibleItems = expanded ? items : items.slice(0, NEWS_PREVIEW_LIMIT);
      node.innerHTML = visibleItems.map(function (item) {
        var dateLabel = item.date ? escapeHtml(item.date) + ' · ' : '';
        var categoryLabel = escapeHtml(item.category || '');
        return (
          '<article class="news-card">' +
            '<span class="news-card__date">' + dateLabel + categoryLabel + '</span>' +
            '<h3>' + escapeHtml(item.title || '') + '</h3>' +
            '<p>' + escapeHtml(item.text || '') + '</p>' +
          '</article>'
        );
      }).join('');

      if (actions && toggleButton) {
        actions.hidden = items.length <= NEWS_PREVIEW_LIMIT;
        toggleButton.textContent = expanded ? 'Сховати' : 'Показати більше';
      }
    }

    if (toggleButton && !toggleButton.dataset.bound) {
      toggleButton.dataset.bound = 'true';
      toggleButton.addEventListener('click', function () {
        expanded = !expanded;
        renderNewsItems();
      });
    }

    renderNewsItems();
  }

  function applyMediaSettings() {
    var heroVideo = findOne('.hero__video-embed');
    var videoUrl = siteConfig.media.hero_video_url || '';

    if (!heroVideo || !videoUrl) {
      return;
    }

    heroVideo.src = buildYoutubeEmbedUrl(videoUrl);
  }

  function applyStaticBlockVisibility() {
    setHidden('services', !isBlockEnabled('services'));
    setHidden('live-status', !isBlockEnabled('live_status'));
    setHidden('weather', !isBlockEnabled('weather'));
    setHidden('watering', !isBlockEnabled('watering'));
    setHidden('bus', !isBlockEnabled('bus'));
    setHidden('rates', !isBlockEnabled('rates'));
    setHidden('meter', !isBlockEnabled('meter'));
    setHidden('feedback', !isBlockEnabled('feedback'));
    setHidden('news', !isBlockEnabled('news'));
    setHidden('contacts', !isBlockEnabled('contacts'));
    refreshLiveStatusVisibility();
  }

  function refreshLiveStatusVisibility() {
    var liveSection = byId('live-status');
    if (!liveSection) {
      return;
    }

    if (!isBlockEnabled('live_status')) {
      liveSection.hidden = true;
      return;
    }

    var visibleIds = ['powerStatusCard', 'alertStatusCard', 'weather', 'waterLevelCard', 'fishingForecastCard'];
    var hasVisibleCard = visibleIds.some(function (id) {
      var node = byId(id);
      return node && !node.hidden;
    });

    liveSection.hidden = !hasVisibleCard;
  }

  function applySiteData(siteData) {
    if (!siteData) {
      return;
    }

    siteConfig.blocks = siteData.blocks || {};
    siteConfig.media = siteData.media || {};

    setText('siteTopStripText', getTextBlock(siteData, 'site', 'top_strip_text'));
    setText('siteContactLinkText', getTextBlock(siteData, 'site', 'contact_link_text'));
    setText('heroEyebrow', getTextBlock(siteData, 'hero', 'eyebrow'));
    setText('heroTitle', getTextBlock(siteData, 'hero', 'title'));
    setText('heroLead', getTextBlock(siteData, 'hero', 'lead'));
    setText('heroPrimaryButton', getTextBlock(siteData, 'hero', 'primary_button_text'));
    setText('heroSecondaryButton', getTextBlock(siteData, 'hero', 'secondary_button_text'));
    setText('servicesEyebrow', getTextBlock(siteData, 'services', 'eyebrow'));
    setText('servicesTitle', getTextBlock(siteData, 'services', 'title'));
    setText('liveStatusEyebrow', getTextBlock(siteData, 'live_status', 'eyebrow'));
    setText('liveStatusTitle', getTextBlock(siteData, 'live_status', 'title'));
    setText('wateringEyebrow', getTextBlock(siteData, 'watering', 'eyebrow'));
    setText('wateringTitle', getTextBlock(siteData, 'watering', 'title'));
    setText('busEyebrow', getTextBlock(siteData, 'bus', 'eyebrow'));
    setText('busTitle', getTextBlock(siteData, 'bus', 'title'));
    setText('busIntro', getTextBlock(siteData, 'bus', 'intro'));
    setText('ratesEyebrow', getTextBlock(siteData, 'rates', 'eyebrow'));
    setText('ratesTitle', getTextBlock(siteData, 'rates', 'title'));
    setText('paymentTitle', getTextBlock(siteData, 'rates', 'payment_title'));
    setText('paymentNoticeText', getTextBlock(siteData, 'rates', 'payment_notice'));
    setText('meterEyebrow', getTextBlock(siteData, 'meter', 'eyebrow'));
    setText('meterTitle', getTextBlock(siteData, 'meter', 'title'));
    setText('meterText', getTextBlock(siteData, 'meter', 'text'));
    setText('meterFormButton', getTextBlock(siteData, 'meter', 'button_text'));
    setText('meterFormHint', getTextBlock(siteData, 'meter', 'hint'));
    setText('feedbackEyebrow', getTextBlock(siteData, 'feedback', 'eyebrow'));
    setText('feedbackTitle', getTextBlock(siteData, 'feedback', 'title'));
    setText('feedbackText', getTextBlock(siteData, 'feedback', 'text'));
    setText('newsEyebrow', getTextBlock(siteData, 'news', 'eyebrow'));
    setText('newsTitle', getTextBlock(siteData, 'news', 'title'));
    setText('weatherTitle', getTextBlock(siteData, 'weather', 'title'));
    setText('weatherTodayLabel', getTextBlock(siteData, 'weather', 'today_label'));
    setText('contactsEyebrow', getTextBlock(siteData, 'contacts', 'eyebrow'));
    setText('contactsTitle', getTextBlock(siteData, 'contacts', 'title'));
    setText('contactsText', getTextBlock(siteData, 'contacts', 'text'));
    setText('contactAddress', getTextBlock(siteData, 'contacts', 'address'));
    setText('contactEmail', getTextBlock(siteData, 'contacts', 'email'));
    setText('contactHours', getTextBlock(siteData, 'contacts', 'hours'));

    renderHeroFacts(siteData.heroFacts || []);
    renderServiceCards(siteData.serviceCards || []);
    renderWateringCards(siteData.wateringCards || []);
    renderBusData(siteData.bus || []);
    renderRates(siteData.rates || []);
    renderPaymentDetails(siteData.paymentDetails || []);
    renderNews(siteData.news || []);
    applyMediaSettings();
    applyStaticBlockVisibility();
  }

  function loadSiteDataJsonp(baseUrl) {
    return new Promise(function (resolve, reject) {
      var callbackName = SITE_DATA_CALLBACK_PREFIX + Date.now();
      var script = document.createElement('script');
      var separator = baseUrl.indexOf('?') === -1 ? '?' : '&';
      var timeoutId = null;

      window[callbackName] = function (payload) {
        cleanup();
        resolve(payload);
      };

      function cleanup() {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        try {
          delete window[callbackName];
        } catch (error) {
          window[callbackName] = undefined;
        }
      }

      script.src = baseUrl + separator + 'action=siteData&callback=' + encodeURIComponent(callbackName) + '&_ts=' + Date.now();
      script.onerror = function () {
        cleanup();
        reject(new Error('Не вдалося завантажити дані сайту.'));
      };

      timeoutId = window.setTimeout(function () {
        cleanup();
        reject(new Error('Час очікування даних сайту вичерпано.'));
      }, 25000);

      document.body.appendChild(script);
    });
  }

  function applyLiveStatus(data) {
    var hasVisibleLiveCards = false;

    if (!data) {
      setHidden('live-status', true);
      return;
    }

    if (data.power) {
      setHidden('powerStatusCard', !isBlockEnabled('power') || data.power.visible === false);
      if (isBlockEnabled('power') && data.power.visible !== false) {
        hasVisibleLiveCards = true;
      }
      setText('powerStatusText', data.power.status || 'Немає даних');
      setText('powerStatusMeta', data.power.meta || 'Дані тимчасово недоступні.');
      setHref('powerStatusLink', data.power.sourceUrl);
    }

    if (data.alert) {
      setHidden('alertStatusCard', !isBlockEnabled('alert') || data.alert.visible === false);
      if (isBlockEnabled('alert') && data.alert.visible !== false) {
        hasVisibleLiveCards = true;
      }
      setText('alertStatusText', data.alert.status || 'Немає даних');
      setText('alertStatusMeta', data.alert.meta || 'Дані тимчасово недоступні.');
      setHref('alertStatusLink', data.alert.sourceUrl);
    }

    if (data.water) {
      setHidden('waterLevelCard', !isBlockEnabled('water') || data.water.visible === false);
      if (isBlockEnabled('water') && data.water.visible !== false) {
        hasVisibleLiveCards = true;
      }
      setText('waterLevelText', data.water.status || 'Немає даних');
      setText('waterLevelMeta', data.water.meta || 'Дані тимчасово недоступні.');
      setHref('waterLevelLink', data.water.sourceUrl);
    }

    if (data.fishing) {
      setHidden('fishingForecastCard', !isBlockEnabled('fishing') || data.fishing.visible === false);
      if (isBlockEnabled('fishing') && data.fishing.visible !== false) {
        hasVisibleLiveCards = true;
      }
      setText('fishingForecastText', data.fishing.status || 'Немає даних');
      setText('fishingForecastMeta', data.fishing.meta || 'Дані тимчасово недоступні.');
      setHref('fishingForecastLink', data.fishing.sourceUrl);
    }

    setHidden('weather', !isBlockEnabled('weather'));
    if (isBlockEnabled('weather')) {
      hasVisibleLiveCards = true;
    }

    setHidden('live-status', !isBlockEnabled('live_status') || !hasVisibleLiveCards);
    refreshLiveStatusVisibility();
  }

  async function loadLiveStatus() {
    try {
      var data = await fetchJson(LIVE_STATUS_URL);
      applyLiveStatus(data);
    } catch (error) {
      setHidden('powerStatusCard', true);
      setHidden('alertStatusCard', true);
      setHidden('waterLevelCard', true);
      setHidden('fishingForecastCard', true);
      refreshLiveStatusVisibility();
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
    hint.textContent = 'Форма подання тимчасово недоступна.';
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

      var weatherByDate = {};
      dates.forEach(function (date, index) {
        weatherByDate[date] = {
          date: date,
          code: codes[index],
          min: minTemps[index],
          max: maxTemps[index],
          precip: precip[index] || 0
        };
      });

      var todayDate = new Date();
      var todayIso = toIsoDate(todayDate);
      var monday = new Date(todayDate);
      var dayIndex = monday.getDay();
      var offsetToMonday = dayIndex === 0 ? -6 : 1 - dayIndex;
      monday.setDate(monday.getDate() + offsetToMonday);

      var weekItems = [];
      for (var i = 0; i < 7; i += 1) {
        var weekDate = new Date(monday);
        weekDate.setDate(monday.getDate() + i);
        var iso = toIsoDate(weekDate);
        if (weatherByDate[iso]) {
          weekItems.push(weatherByDate[iso]);
        }
      }

      setText(
        'weatherToday',
        'Зараз ' + Math.round(current.temperature_2m) + '°C, ' + weatherLabel(current.weather_code)
      );
      setText(
        'weatherMeta',
        'Сьогодні: від ' + Math.round(minTemps[dates.indexOf(todayIso)] || minTemps[0]) + '°C до ' +
          Math.round(maxTemps[dates.indexOf(todayIso)] || maxTemps[0]) + '°C. Вітер ' +
          Math.round(current.wind_speed_10m || 0) + ' км/год.'
      );

      daysNode.innerHTML = weekItems.map(function (item) {
        var isToday = item.date === todayIso;
        return (
          '<article class="weather-day' + (isToday ? ' weather-day--today' : '') + '">' +
            '<strong>' + formatWeekDay(item.date) + ', ' + formatShortDate(item.date) + '</strong>' +
            '<span>' + weatherLabel(item.code) + '</span>' +
            '<span>' + Math.round(item.min) + '°C ... ' + Math.round(item.max) + '°C</span>' +
            '<span>Опади: ' + Math.round(item.precip || 0) + '%</span>' +
          '</article>'
        );
      }).join('');
    } catch (error) {
      setHidden('weather', true);
      daysNode.innerHTML = '';
      refreshLiveStatusVisibility();
    }
  }

  async function loadFeedbackConfig() {
    var form = byId('feedbackForm');
    var submit = byId('feedbackSubmit');
    var note = byId('feedbackFormNote');
    var status = byId('feedbackStatusHint');
    var startedAt = byId('feedbackClientStartedAt');
    var phoneField = byId('feedbackPhone');

    if (!form || !submit || !note || !status) {
      return;
    }

    if (startedAt) {
      startedAt.value = new Date().toISOString();
    }

    var webhookUrl = '';
    var transport = 'apps-script';

    try {
      var config = await fetchJson(FEEDBACK_CONFIG_URL);
      webhookUrl = config.webhookUrl || '';
      transport = config.transport || 'apps-script';
      setOptionalText('feedbackFormNote', config.hint || '');
      setOptionalText('feedbackStatusHint', config.statusText || '');

      if (webhookUrl) {
        loadSiteDataJsonp(webhookUrl)
          .then(applySiteData)
          .catch(function () {
            return null;
          });
      }
    } catch (error) {
      setOptionalText('feedbackFormNote', '');
      setOptionalText('feedbackStatusHint', '');
    }

    if (!webhookUrl) {
      submit.setAttribute('aria-disabled', 'true');
      submit.disabled = true;
      setOptionalText('feedbackFormNote', 'Форма звернення тимчасово недоступна.');
      return;
    }

    submit.disabled = false;
    submit.removeAttribute('aria-disabled');

    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      var formData = new FormData(form);
      var normalizedPhone = normalizeUAPhone(formData.get('phone'));
      var payload = {
        name: String(formData.get('name') || '').trim(),
        plot: String(formData.get('plot') || '').trim(),
        phone: normalizedPhone,
        message: String(formData.get('message') || '').trim(),
        company: String(formData.get('company') || '').trim(),
        clientStartedAt: String(formData.get('clientStartedAt') || '').trim(),
        submittedAt: new Date().toISOString(),
        source: window.location.href,
        userAgent: navigator.userAgent || '',
        formType: 'feedback'
      };

      if (!payload.name || !payload.plot || !payload.phone || !payload.message) {
        note.hidden = false;
        note.textContent = 'Заповніть усі поля форми.';
        return;
      }

      if (!isValidUAPhone(payload.phone)) {
        note.hidden = false;
        note.textContent = 'Вкажіть український мобільний номер у форматі +380671234567.';
        if (phoneField) {
          phoneField.focus();
        }
        return;
      }

      if (phoneField) {
        phoneField.value = payload.phone;
      }

      submit.disabled = true;
      note.hidden = false;
      note.textContent = 'Надсилаємо повідомлення…';

      try {
        if (transport === 'apps-script') {
          await submitAppsScriptForm(webhookUrl, payload);
        } else {
          var response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            throw new Error('HTTP ' + response.status);
          }
        }

        form.reset();
        if (startedAt) {
          startedAt.value = new Date().toISOString();
        }
        note.hidden = false;
        note.textContent = 'Повідомлення успішно відправлено.';
      } catch (error) {
        note.hidden = false;
        note.textContent = error && error.message
          ? error.message
          : 'Не вдалося відправити звернення. Спробуйте пізніше.';
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
