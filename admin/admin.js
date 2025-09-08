document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var user = document.getElementById('username').value;
  var pass = document.getElementById('password').value;
  if (user === 'admin' && pass === 'vider') {
    document.getElementById('login').style.display = 'none';
    document.getElementById('editor').style.display = 'block';

    document.getElementById('logoUrl').value = getLogo();
    document.getElementById('bannerUrl').value = getBanner();

    var menuForm = document.getElementById('menuForm');
    menuForm.innerHTML = '';
    var menu = getMenu();
    menu.forEach(function (item) {
      var div = document.createElement('div');
      div.innerHTML = '<input type="text" placeholder="Name" value="' + item.name + '"> ' +
        '<input type="text" placeholder="URL" value="' + item.url + '">';
      menuForm.appendChild(div);
    });
    var menuSave = document.createElement('button');
    menuSave.type = 'submit';
    menuSave.textContent = 'Save Menu';
    menuForm.appendChild(menuSave);

    var articlesForm = document.getElementById('articlesForm');
    articlesForm.innerHTML = '';
    var articles = getArticles();
    articles.forEach(function (art, idx) {
      var fs = document.createElement('fieldset');
      var legend = document.createElement('legend');
      legend.textContent = 'Article ' + (idx + 1);
      fs.appendChild(legend);
      fs.innerHTML += '<input type="text" placeholder="Image URL" value="' + art.img + '">' +
        '<input type="text" placeholder="Category" value="' + art.category + '">' +
        '<input type="text" placeholder="Title" value="' + art.title + '">' +
        '<textarea placeholder="Text">' + art.text + '</textarea>';
      articlesForm.appendChild(fs);
    });
    var artSave = document.createElement('button');
    artSave.type = 'submit';
    artSave.textContent = 'Save Articles';
    articlesForm.appendChild(artSave);
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
});

document.getElementById('logoForm').addEventListener('submit', function (e) {
  e.preventDefault();
  setLogo(document.getElementById('logoUrl').value.trim());
  alert('Logo saved');
});

document.getElementById('bannerForm').addEventListener('submit', function (e) {
  e.preventDefault();
  setBanner(document.getElementById('bannerUrl').value.trim());
  alert('Banner saved');
});

document.getElementById('menuForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var rows = document.querySelectorAll('#menuForm div');
  var menu = Array.from(rows).map(function (row) {
    var inputs = row.querySelectorAll('input');
    return { name: inputs[0].value.trim(), url: inputs[1].value.trim() };
    });
  setMenu(menu);
  alert('Menu saved');
});

document.getElementById('articlesForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var sets = document.querySelectorAll('#articlesForm fieldset');
  var articles = Array.from(sets).map(function (fs) {
    var inputs = fs.querySelectorAll('input');
    var textarea = fs.querySelector('textarea');
    return {
      img: inputs[0].value.trim(),
      category: inputs[1].value.trim(),
      title: inputs[2].value.trim(),
      text: textarea.value.trim()
    };
  });
  setArticles(articles);
  alert('Articles saved');
});
