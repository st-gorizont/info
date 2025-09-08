const defaultMenu = [
  { name: 'lifestyle', url: '#' },
  { name: 'photodiary', url: '#' },
  { name: 'travel', url: '#' },
  { name: 'music', url: '#' }
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

const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris';

const now = Date.now();
const defaultArticles = [
  {
    img: 'img/image1.jpg',
    category: 'Lifestyle',
    title: 'More than just a music festival',
    text: lorem,
    date: now
  },
  {
    img: 'img/image2.jpg',
    category: 'Lifestyle',
    title: 'Life tastes better with coffee',
    text: lorem,
    date: now - 1
  },
  {
    img: 'img/image3.jpg',
    category: 'photodiary',
    title: 'American dream',
    text: lorem,
    date: now - 2
  },
  {
    img: 'img/image4.jpg',
    category: 'photodiary',
    title: 'A day exploring the Alps',
    text: lorem,
    date: now - 3
  },
  {
    img: 'img/image5.jpg',
    category: 'lifestyle',
    title: 'Top 10 song for running',
    text: lorem,
    date: now - 4
  },
  {
    img: 'img/image6.jpg',
    category: 'lifestyle',
    title: 'Cold winter days',
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
  { title: 'Home', url: 'index', blocks: [{ type: 'posts' }] }
];

async function getPages() {
  try {
    const stored = localStorage.getItem('pages');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse pages', e);
  }
  return defaultPages;
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
        loadMoreBtn.textContent = 'Show more';
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
        node.innerHTML = '<input name="name" type="text" placeholder="Name">' +
          '<input name="phone" type="text" placeholder="Phone">' +
          '<input name="email" type="email" placeholder="Email">' +
          '<button type="submit">Send</button>';
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
          }).then(() => alert('Sent'));
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
        postsBtn.textContent = 'Show more';
        postsBtn.addEventListener('click', e => { e.preventDefault(); renderPosts(); });
        renderPosts();
        container.appendChild(node);
        container.appendChild(postsBtn);
        break;
      case 'rss':
        node = document.createElement('div');
        const list = document.createElement('ul');
        node.appendChild(list);
        container.appendChild(node);
        const rssBtn = document.createElement('button');
        rssBtn.textContent = 'Show more';
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
              const li = document.createElement('li');
              const a = document.createElement('a');
              const linkEl = it.querySelector('link');
              const titleEl = it.querySelector('title');
              a.href = linkEl ? linkEl.textContent : '#';
              a.textContent = titleEl ? titleEl.textContent : '';
              li.appendChild(a);
              list.appendChild(li);
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
          node.textContent = 'Failed to load feed';
          rssBtn.style.display = 'none';
        });
        break;
      default:
        break;
    }
  });
}
