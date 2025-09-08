 codex-6zr2ci
const defaultConfig = {
  logo: 'img/logo.svg',
  menu: [
    { label: 'lifestyle', url: '#' },
    { label: 'photodiary', url: '#' },
    { label: 'travel', url: '#' },
    { label: 'music', url: '#' }
  ],
  articles: [
    {
      image: 'img/image1.jpg',
      category: 'Lifestyle',
      title: 'More than just a music festival',
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    },
    {
      image: 'img/image2.jpg',
      category: 'Lifestyle',
      title: 'Life tastes better with coffee',
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    },
    {
      image: 'img/image3.jpg',
      category: 'photodiary',
      title: 'American dream',
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    },
    {
      image: 'img/image4.jpg',
      category: 'photodiary',
      title: 'A day exploring the Alps',
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    },
    {
      image: 'img/image5.jpg',
      category: 'lifestyle',
      title: 'Top 10 song for running',
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    },
    {
      image: 'img/image6.jpg',
      category: 'lifestyle',
      title: 'Cold winter days',
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    }
  ]
};

function getConfig() {
  const stored = localStorage.getItem('siteConfig');
=======
function getMenuNames() {
  const stored = localStorage.getItem('menuNames');
 master
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
 codex-6zr2ci
      console.error('Failed to parse site config');
    }
  }
  return JSON.parse(JSON.stringify(defaultConfig));
}

function setConfig(cfg) {
  localStorage.setItem('siteConfig', JSON.stringify(cfg));
}

function applySiteConfig() {
  const cfg = getConfig();
  const logoImg = document.querySelector('.logo img');
  if (logoImg) {
    logoImg.src = cfg.logo;
  }
  const menuLinks = document.querySelectorAll('.menu a');
  cfg.menu.forEach((item, idx) => {
    if (menuLinks[idx]) {
      menuLinks[idx].textContent = item.label;
      menuLinks[idx].href = item.url;
    }
  });
  const articles = document.querySelectorAll('main article');
  cfg.articles.forEach((art, idx) => {
    const el = articles[idx];
    if (!el) return;
    const img = el.querySelector('img');
    const cat = el.querySelector('.ubuntu');
    const title = el.querySelector('h2');
    const text = el.querySelector('.p__text');
    if (img) img.src = art.image;
    if (cat) cat.textContent = art.category;
    if (title) title.textContent = art.title;
    if (text) text.textContent = art.text;
  });
=======
      console.error('Failed to parse menu names from localStorage');
    }
  }
  return ['lifestyle', 'photodiary', 'travel', 'music'];
}

function setMenuNames(names) {
  localStorage.setItem('menuNames', JSON.stringify(names));
}

function applyMenuNames(selector) {
  const links = document.querySelectorAll(selector);
  const names = getMenuNames();
  names.forEach((name, idx) => {
    if (links[idx]) {
      links[idx].textContent = name;
    }
  });
 master
}
