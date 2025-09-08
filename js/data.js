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
  const links = document.querySelectorAll(selector);
  const menu = getMenu();
  menu.forEach((item, idx) => {
    if (links[idx]) {
      links[idx].textContent = item.name;
      links[idx].setAttribute('href', item.url || '#');
    }
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

const defaultArticles = [
  { img: 'img/image1.jpg', category: 'Lifestyle', title: 'More than just a music festival', text: lorem },
  { img: 'img/image2.jpg', category: 'Lifestyle', title: 'Life tastes better with coffee', text: lorem },
  { img: 'img/image3.jpg', category: 'photodiary', title: 'American dream', text: lorem },
  { img: 'img/image4.jpg', category: 'photodiary', title: 'A day exploring the Alps', text: lorem },
  { img: 'img/image5.jpg', category: 'lifestyle', title: 'Top 10 song for running', text: lorem },
  { img: 'img/image6.jpg', category: 'lifestyle', title: 'Cold winter days', text: lorem }
];

function getArticles() {
  const stored = localStorage.getItem('articles');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse articles data');
    }
  }
  return defaultArticles;
}

function setArticles(articles) {
  localStorage.setItem('articles', JSON.stringify(articles));
}

function applyArticles() {
  const data = getArticles();
  const nodes = document.querySelectorAll('main article');
  data.forEach((article, idx) => {
    const node = nodes[idx];
    if (!node) return;
    const img = node.querySelector('img');
    const category = node.querySelector('.ubuntu');
    const title = node.querySelector('.h1__font');
    const text = node.querySelector('.p__text');
    if (img) img.src = article.img;
    if (category) category.textContent = article.category;
    if (title) title.textContent = article.title;
    if (text) text.textContent = article.text;
  });
}
