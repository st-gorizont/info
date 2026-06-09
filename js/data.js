const defaultMenu = [
  { name: 'Головна', url: 'index.html' },
  { name: 'Тарифи', url: 'index.html#rates' },
  { name: 'Документи', url: 'index.html#documents' },
  { name: 'Оголошення', url: 'index.html#news' },
  { name: 'Контакти', url: 'index.html#contacts' }
];

function getMenu() {
  const stored = localStorage.getItem('menu');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse menu data');
    }
  }
  return defaultMenu;
}

function setMenu(menu) {
  localStorage.setItem('menu', JSON.stringify(menu));
}

function applyMenu(selector) {
  const list = document.querySelector(selector);
  const menu = getMenu();
  if (!list) return;
  list.innerHTML = '';
  menu.forEach(item => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.textContent = item.name;
    a.setAttribute('href', item.url || '#');
    li.appendChild(a);
    list.appendChild(li);
  });
}

const defaultLogo = 'img/Livello 7.jpg';

function getLogo() {
  return localStorage.getItem('logo') || defaultLogo;
}

function setLogo(src) {
  localStorage.setItem('logo', src);
}

function applyLogo(selector) {
  const img = document.querySelector(selector);
  if (img) {
    img.src = getLogo();
  }
}

const defaultBanner = 'img/image1.jpg';

function getBanner() {
  return localStorage.getItem('banner') || defaultBanner;
}

function setBanner(src) {
  localStorage.setItem('banner', src);
}

function applyBanner(selector) {
  const img = document.querySelector(selector);
  if (img) {
    img.src = getBanner();
  }
}

const lorem = 'Інформаційне повідомлення для мешканців садового товариства. Тут можна розміщувати деталі щодо оплат, робіт на території, рішень правління або технічних повідомлень.';

const now = Date.now();
const defaultArticles = [
  {
    img: 'img/image1.jpg',
    category: 'Оголошення',
    title: 'Планові роботи на електролінії товариства',
    text: lorem,
    date: now
  },
  {
    img: 'img/image2.jpg',
    category: 'Оплата',
    title: 'Нагадування про передачу показників лічильника',
    text: lorem,
    date: now - 1
  },
  {
    img: 'img/image3.jpg',
    category: 'Рішення правління',
    title: 'Оновлення внесків та поточних витрат',
    text: lorem,
    date: now - 2
  },
  {
    img: 'img/image4.jpg',
    category: 'Благоустрій',
    title: 'Графік сезонних робіт на території',
    text: lorem,
    date: now - 3
  },
  {
    img: 'img/image5.jpg',
    category: 'Документи',
    title: 'Публікація статуту та внутрішніх правил',
    text: lorem,
    date: now - 4
  },
  {
    img: 'img/image6.jpg',
    category: 'Контакти',
    title: 'Оновлені контакти правління та служб',
    text: lorem,
    date: now - 5
  }
];

function getArticles() {
  const stored = localStorage.getItem('articles');
  let articles = defaultArticles;
  if (stored) {
    try {
      articles = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse articles data');
    }
  }
  return articles.sort((a, b) => (b.date || 0) - (a.date || 0));
}

function setArticles(articles) {
  localStorage.setItem('articles', JSON.stringify(articles));
}

function applyArticles() {
  const data = getArticles();
  const container = document.querySelector('main');
  if (!container) return;
  container.innerHTML = '';

  let rendered = 0;
  const batch = 6;

  function renderBatch() {
    const next = Math.min(rendered + batch, data.length);
    for (let i = rendered; i < next; i++) {
      const article = data[i];
      const link = document.createElement('a');
      link.href = `post.html?id=${i}`;

      const node = document.createElement('article');

      const img = document.createElement('img');
      img.src = article.img;
      img.alt = article.title;
      node.appendChild(img);

      const category = document.createElement('p');
      category.className = 'ubuntu';
      category.textContent = article.category;
      node.appendChild(category);

      const title = document.createElement('h2');
      title.className = 'h1__font';
      title.textContent = article.title;
      node.appendChild(title);

      const text = document.createElement('p');
      text.className = 'p__text';
      text.textContent = article.text;
      node.appendChild(text);

      link.appendChild(node);
      container.appendChild(link);
    }
    rendered = next;
    if (rendered >= data.length && loadMoreBtn) {
      loadMoreBtn.style.display = 'none';
    }
  }

  const loadMoreBtn = document.getElementById('loadMore');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function (e) {
      e.preventDefault();
      renderBatch();
    });
  }

  renderBatch();
}

const TELEGRAM_TOKEN = '358296869:AAGfM7zpZsl8oSVnXWrF_AMzDPwN9zgsOSk';
const TELEGRAM_CHAT = '-1002649665529';

const defaultPages = [
  { title: 'Головна', url: 'index', blocks: [{ type: 'posts' }] }
];

async function getPages() {
  let pages;
  try {
    const stored = localStorage.getItem('pages');
    if (stored) {
      pages = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse pages', e);
  }
  if (!Array.isArray(pages)) {
    pages = defaultPages.slice();
  }
  if (!pages.some(p => p.url === 'index')) {
    pages.unshift({ title: 'Головна', url: 'index', blocks: [{ type: 'posts' }] });
  }
  return pages;
}

async function setPages(pages) {
  try {
    localStorage.setItem('pages', JSON.stringify(pages));
  } catch (e) {
    console.error('Failed to save pages', e);
  }
}

async function applyPage(url) {
  const pages = await getPages();
  const page = pages.find(p => p.url === url);
  const container = document.getElementById('pageContent') || document.querySelector('main');
  if (!page || !container) return;
  container.innerHTML = '';
  page.blocks.forEach(block => {
    let node;
    switch (block.type) {
      case 'gallery':
        node = document.createElement('div');
        node.className = 'gallery';
        let rendered = 0;
        const batch = 6;
        function renderBatch() {
          const next = Math.min(rendered + batch, block.images.length);
          for (let i = rendered; i < next; i++) {
            const img = document.createElement('img');
            img.src = block.images[i];
            node.appendChild(img);
          }
          rendered = next;
          if (rendered >= block.images.length && loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
          }
        }
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.textContent = 'Показати ще';
        loadMoreBtn.addEventListener('click', e => {
          e.preventDefault();
          renderBatch();
        });
        renderBatch();
        container.appendChild(node);
        container.appendChild(loadMoreBtn);
        break;
      case 'text':
        node = document.createElement('div');
        const h = document.createElement('h2');
        h.textContent = block.title || '';
        const p = document.createElement('p');
        p.textContent = block.text || '';
        node.appendChild(h);
        node.appendChild(p);
        container.appendChild(node);
        break;
      case 'form':
        node = document.createElement('form');
        node.className = 'contactForm';
        node.innerHTML = '<input name="name" type="text" placeholder="Імʼя">' +
          '<input name="phone" type="text" placeholder="Телефон">' +
          '<input name="email" type="email" placeholder="Email">' +
          '<button type="submit">Надіслати</button>';
        node.addEventListener('submit', function (e) {
          e.preventDefault();
          const data = new FormData(node);
          fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT,
              text: `Name: ${data.get('name')}\nPhone: ${data.get('phone')}\nEmail: ${data.get('email')}`
            })
          }).then(() => alert('Надіслано'));
        });
        container.appendChild(node);
        break;
      case 'social':
        node = document.createElement('div');
        node.className = 'social';
        (block.items || []).forEach(it => {
          const a = document.createElement('a');
          a.href = it.link || '#';
          const img = document.createElement('img');
          img.src = it.img || '';
          img.alt = it.name || '';
          a.appendChild(img);
          const span = document.createElement('span');
          span.textContent = it.name || '';
          a.appendChild(span);
          node.appendChild(a);
        });
        container.appendChild(node);
        break;
      case 'posts':
        node = document.createElement('div');
        node.className = 'posts-grid';
        const posts = getArticles();
        let postsRendered = 0;
        const postsBatch = 6;
        function renderPosts() {
          const next = Math.min(postsRendered + postsBatch, posts.length);
          for (let i = postsRendered; i < next; i++) {
            const article = posts[i];
            const link = document.createElement('a');
            link.href = `post.html?id=${i}`;

            const art = document.createElement('article');
            const img = document.createElement('img');
            img.src = article.img;
            img.alt = article.title;
            art.appendChild(img);

            const category = document.createElement('p');
            category.className = 'ubuntu';
            category.textContent = article.category;
            art.appendChild(category);

            const title = document.createElement('h2');
            title.className = 'h1__font';
            title.textContent = article.title;
            art.appendChild(title);

            const text = document.createElement('p');
            text.className = 'p__text';
            text.textContent = article.text;
            art.appendChild(text);

            link.appendChild(art);
            node.appendChild(link);
          }
          postsRendered = next;
          if (postsRendered >= posts.length && postsBtn) {
            postsBtn.style.display = 'none';
          }
        }
        const postsBtn = document.createElement('button');
        postsBtn.className = 'load-more';
        postsBtn.textContent = 'Показати ще';
        postsBtn.addEventListener('click', e => { e.preventDefault(); renderPosts(); });
        renderPosts();
        container.appendChild(node);
        container.appendChild(postsBtn);
        break;
      case 'rss':
        node = document.createElement('div');
        node.className = 'posts-grid';
        container.appendChild(node);
        const rssBtn = document.createElement('button');
        rssBtn.textContent = 'Показати ще';
        rssBtn.style.display = 'none';
        container.appendChild(rssBtn);
        function fetchRSS(url) {
          return fetch(url).then(res => {
            if (res.ok) return res.text();
            throw new Error('Failed');
          }).catch(() => fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url)).then(r => r.text()));
        }
        fetchRSS(block.url).then(str => {
          const parser = new DOMParser();
          const xml = parser.parseFromString(str, 'application/xml');
          const items = Array.from(xml.querySelectorAll('item'));
          let rendered = 0;
          const batch = 6;
          function renderBatch() {
            const next = Math.min(rendered + batch, items.length);
            for (let i = rendered; i < next; i++) {
              const it = items[i];
              const linkEl = it.querySelector('link');
              const titleEl = it.querySelector('title');
              const descEl = it.querySelector('description');
              let imgUrl = '';
              const enc = it.querySelector('enclosure');
              if (enc && enc.getAttribute('url')) {
                imgUrl = enc.getAttribute('url');
              } else if (descEl) {
                try {
                  const dp = new DOMParser();
                  const html = dp.parseFromString(descEl.textContent, 'text/html');
                  const imgTag = html.querySelector('img');
                  if (imgTag) imgUrl = imgTag.src;
                } catch (e) {
                }
              }
              const a = document.createElement('a');
              a.href = linkEl ? linkEl.textContent : '#';
              const art = document.createElement('article');
              if (imgUrl) {
                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = titleEl ? titleEl.textContent : '';
                art.appendChild(img);
              }
              if (titleEl) {
                const h2 = document.createElement('h2');
                h2.className = 'h1__font';
                h2.textContent = titleEl.textContent;
                art.appendChild(h2);
              }
              if (descEl) {
                const p = document.createElement('p');
                p.className = 'p__text';
                p.textContent = descEl.textContent;
                art.appendChild(p);
              }
              a.appendChild(art);
              node.appendChild(a);
            }
            rendered = next;
            if (rendered >= items.length) {
              rssBtn.style.display = 'none';
            }
          }
          rssBtn.style.display = items.length > 0 ? 'inline' : 'none';
          rssBtn.addEventListener('click', e => { e.preventDefault(); renderBatch(); });
          renderBatch();
        }).catch(() => {
          node.textContent = 'Не вдалося завантажити стрічку';
          rssBtn.style.display = 'none';
        });
        break;
      default:
        break;
    }
  });
}
