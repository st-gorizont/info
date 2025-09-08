document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var user = document.getElementById('username').value;
  var pass = document.getElementById('password').value;
  if (user === 'admin' && pass === 'vider') {
    document.getElementById('login').style.display = 'none';
    renderEditor();
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
});

function renderEditor() {
  const cfg = getConfig();
  const editor = document.getElementById('editor');
  editor.textContent = '';

  const title = document.createElement('h1');
  title.textContent = 'Site Settings';

  const form = document.createElement('form');
  form.id = 'siteForm';

  // Logo
  const logoSet = document.createElement('fieldset');
  const logoLegend = document.createElement('legend');
  logoLegend.textContent = 'Logo';
  const logoInput = document.createElement('input');
  logoInput.type = 'text';
  logoInput.name = 'logo';
  logoInput.value = cfg.logo || '';
  logoSet.appendChild(logoLegend);
  logoSet.appendChild(logoInput);

  // Menu
  const menuSet = document.createElement('fieldset');
  const menuLegend = document.createElement('legend');
  menuLegend.textContent = 'Menu';
  menuSet.appendChild(menuLegend);
  cfg.menu.forEach(function (item, idx) {
    const row = document.createElement('div');
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.name = 'menuLabel' + idx;
    labelInput.placeholder = 'Label';
    labelInput.value = item.label;
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.name = 'menuUrl' + idx;
    urlInput.placeholder = 'URL';
    urlInput.value = item.url;
    row.appendChild(labelInput);
    row.appendChild(urlInput);
    menuSet.appendChild(row);
  });

  // Articles
  const artSet = document.createElement('fieldset');
  const artLegend = document.createElement('legend');
  artLegend.textContent = 'Articles';
  artSet.appendChild(artLegend);
  cfg.articles.forEach(function (art, idx) {
    const row = document.createElement('div');
    row.className = 'article-edit';
    const imgInput = document.createElement('input');
    imgInput.type = 'text';
    imgInput.name = 'artImage' + idx;
    imgInput.placeholder = 'Image URL';
    imgInput.value = art.image;
    const catInput = document.createElement('input');
    catInput.type = 'text';
    catInput.name = 'artCategory' + idx;
    catInput.placeholder = 'Category';
    catInput.value = art.category;
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.name = 'artTitle' + idx;
    titleInput.placeholder = 'Title';
    titleInput.value = art.title;
    const textArea = document.createElement('textarea');
    textArea.name = 'artText' + idx;
    textArea.placeholder = 'Text';
    textArea.value = art.text;
    row.appendChild(imgInput);
    row.appendChild(catInput);
    row.appendChild(titleInput);
    row.appendChild(textArea);
    artSet.appendChild(row);
  });

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = 'Save';

  form.appendChild(logoSet);
  form.appendChild(menuSet);
  form.appendChild(artSet);
  form.appendChild(saveBtn);

  editor.appendChild(title);
  editor.appendChild(form);
  editor.style.display = 'block';

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    const newCfg = {
      logo: logoInput.value,
      menu: cfg.menu.map(function (_, idx) {
        return {
          label: form['menuLabel' + idx].value,
          url: form['menuUrl' + idx].value
        };
      }),
      articles: cfg.articles.map(function (_, idx) {
        return {
          image: form['artImage' + idx].value,
          category: form['artCategory' + idx].value,
          title: form['artTitle' + idx].value,
          text: form['artText' + idx].value
        };
      })
    };
    setConfig(newCfg);
    alert('Saved');
  });
}
