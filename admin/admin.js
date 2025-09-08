document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  var user = document.getElementById('username').value;
  var pass = document.getElementById('password').value;
  if (user === 'admin' && pass === 'vider') {
    document.getElementById('login').style.display = 'none';
    var admin = document.getElementById('admin');
    admin.classList.add('active');

    document.getElementById('logoUrl').value = getLogo();
    document.getElementById('bannerUrl').value = getBanner();

    var menuForm = document.getElementById('menuForm');
    menuForm.innerHTML = '';
    getMenu().forEach(function (item) {
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

    function createFieldset(art, idx) {
      var fs = document.createElement('fieldset');
      var legend = document.createElement('legend');
      legend.textContent = 'Article ' + (idx + 1);
      fs.appendChild(legend);
      fs.innerHTML += '<input type="text" placeholder="Image URL" value="' + (art.img || '') + '">' +
        '<input type="text" placeholder="Category" value="' + (art.category || '') + '">' +
        '<input type="text" placeholder="Title" value="' + (art.title || '') + '">' +
        '<textarea placeholder="Text">' + (art.text || '') + '</textarea>' +
        '<input type="hidden" class="article-date" value="' + (art.date || '') + '">';
      return fs;
    }

    articles.forEach(function (art, idx) {
      articlesForm.appendChild(createFieldset(art, idx));
    });

    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = 'Add Article';
    articlesForm.appendChild(addBtn);

    var artSave = document.createElement('button');
    artSave.type = 'submit';
    artSave.textContent = 'Save Articles';
    articlesForm.appendChild(artSave);

    addBtn.addEventListener('click', function () {
      var idx = articlesForm.querySelectorAll('fieldset').length;
      articlesForm.insertBefore(createFieldset({}, idx), addBtn);
    });

    await renderPages();
    document.querySelector('#sidebar li').click();
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
});

async function renderPages() {
  var list = document.getElementById('pagesList');
  var term = document.getElementById('pageSearch').value.toLowerCase();
  var pages = await getPages();
  list.innerHTML = '';
  pages.forEach(function (p, idx) {
    if (!p.title.toLowerCase().includes(term)) return;
    var li = document.createElement('li');
    var info = document.createElement('span');
    info.textContent = p.title + ' (' + p.url + ')';
    li.appendChild(info);

    var view = document.createElement('button');
    view.type = 'button';
    view.textContent = 'View';
    view.addEventListener('click', function () {
      window.open('../page.html?url=' + encodeURIComponent(p.url), '_blank');
    });
    li.appendChild(view);

    var edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Edit';
    edit.addEventListener('click', function () {
      location.href = 'page-builder.html?index=' + idx;
    });
    li.appendChild(edit);

    var del = document.createElement('button');
    del.type = 'button';
    del.textContent = 'Delete';
    del.addEventListener('click', async function () {
      if (confirm('Delete this page?')) {
        var pages = await getPages();
        pages.splice(idx, 1);
        await setPages(pages);
        renderPages();
      }
    });
    li.appendChild(del);

    list.appendChild(li);
  });
}

document.getElementById('pageSearch').addEventListener('input', renderPages);
document.getElementById('addPageBtn').addEventListener('click', function () {
  location.href = 'page-builder.html';
});

var tabs = document.querySelectorAll('#sidebar li');
tabs.forEach(function (li) {
  li.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(function (t) { t.style.display = 'none'; });
    var active = document.getElementById('tab-' + li.dataset.tab);
    if (active) active.style.display = 'block';
  });
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
    var dateInput = fs.querySelector('.article-date');
    var date = dateInput.value ? Number(dateInput.value) : Date.now();
    return {
      img: inputs[0].value.trim(),
      category: inputs[1].value.trim(),
      title: inputs[2].value.trim(),
      text: textarea.value.trim(),
      date: date
    };
  });
  setArticles(articles);
  alert('Articles saved');
});

