var editIndex = null;

function addBlock(type, data) {
  var container = document.getElementById('blocks');
  var div = document.createElement('div');
  div.className = 'block';
  div.dataset.type = type;
  if (type === 'gallery') {
    div.innerHTML = '<h3>Gallery</h3><textarea placeholder="Image URLs (one per line)"></textarea>';
    if (data && data.images) {
      div.querySelector('textarea').value = data.images.join('\n');
    }
  } else if (type === 'text') {
    div.innerHTML = '<h3>Text</h3><input type="text" placeholder="Title"><textarea placeholder="Text"></textarea>';
    if (data) {
      var inputs = div.querySelectorAll('input, textarea');
      inputs[0].value = data.title || '';
      inputs[1].value = data.text || '';
    }
  } else if (type === 'form') {
    div.innerHTML = '<h3>Form</h3><p>Form will include name, phone and email fields.</p>';
  } else if (type === 'social') {
    div.innerHTML = '<h3>Social Links</h3><textarea placeholder="[{\\"img\\":\\"url\\",\\"name\\":\\"Name\\",\\"link\\":\\"#\\"}]\\n(one JSON object per line)"></textarea>';
    if (data && data.items) {
      div.querySelector('textarea').value = data.items.map(function (it) { return JSON.stringify(it); }).join('\n');
    }
  } else if (type === 'posts') {
    div.innerHTML = '<h3>Posts</h3><p>Shows list of posts with load more.</p>';
  } else if (type === 'rss') {
    div.innerHTML = '<h3>RSS Feed</h3><input type="text" placeholder="RSS URL">';
    if (data && data.url) {
      div.querySelector('input').value = data.url;
    }
  }
  var rm = document.createElement('button');
  rm.type = 'button';
  rm.textContent = 'Remove';
  rm.addEventListener('click', function () { div.remove(); });
  div.appendChild(rm);
  container.appendChild(div);
}

async function loadPageForEdit() {
  var params = new URLSearchParams(window.location.search);
  var pages = await getPages();
  if (params.has('index')) {
    editIndex = Number(params.get('index'));
    var page = pages[editIndex];
    if (page) {
      document.getElementById('pageTitle').value = page.title;
      document.getElementById('pageUrl').value = page.url;
      (page.blocks || []).forEach(function (b) { addBlock(b.type, b); });
      document.getElementById('deletePageBtn').style.display = 'inline';
    }
  }
}

loadPageForEdit();

document.getElementById('addBlockBtn').addEventListener('click', function () {
  var type = document.getElementById('blockType').value;
  if (!type) return;
  addBlock(type);
});

document.getElementById('viewPageBtn').addEventListener('click', function () {
  var url = document.getElementById('pageUrl').value.trim();
  if (!url) return;
  window.open('../page.html?url=' + encodeURIComponent(url), '_blank');
});

document.getElementById('deletePageBtn').addEventListener('click', async function () {
  if (editIndex === null) return;
  if (!confirm('Delete this page?')) return;
  var pages = await getPages();
  if (pages[editIndex]) {
    pages.splice(editIndex, 1);
    await setPages(pages);
  }
  location.href = 'index.html';
});

document.getElementById('pageForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  var title = document.getElementById('pageTitle').value.trim();
  var url = document.getElementById('pageUrl').value.trim();
  var blocks = Array.from(document.querySelectorAll('#blocks .block')).map(function (div) {
    var type = div.dataset.type;
    if (type === 'gallery') {
      var images = div.querySelector('textarea').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      return { type: type, images: images };
    } else if (type === 'text') {
      var inputs = div.querySelectorAll('input, textarea');
      return { type: type, title: inputs[0].value.trim(), text: inputs[1].value.trim() };
    } else if (type === 'form') {
      return { type: type };
    } else if (type === 'social') {
      var lines = div.querySelector('textarea').value.trim().split('\n');
      var items = [];
      lines.forEach(function (line) {
        try { items.push(JSON.parse(line)); } catch (e) { }
      });
      return { type: type, items: items };
    } else if (type === 'posts') {
      return { type: type };
    } else if (type === 'rss') {
      var input = div.querySelector('input');
      return { type: type, url: input ? input.value.trim() : '' };
    }
    return null;
  }).filter(Boolean);
  var pages = await getPages();
  if (editIndex !== null && pages[editIndex]) {
    pages[editIndex] = { title: title, url: url, blocks: blocks };
  } else {
    pages.push({ title: title, url: url, blocks: blocks });
  }
  await setPages(pages);
  alert('Page saved');
  location.href = 'index.html';
});

