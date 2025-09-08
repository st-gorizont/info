document.getElementById('addBlockBtn').addEventListener('click', function () {
  var type = document.getElementById('blockType').value;
  if (!type) return;
  var container = document.getElementById('blocks');
  var div = document.createElement('div');
  div.className = 'block';
  div.dataset.type = type;
  if (type === 'gallery') {
    div.innerHTML = '<h3>Gallery</h3><textarea placeholder="Image URLs (one per line)"></textarea>';
  } else if (type === 'text') {
    div.innerHTML = '<h3>Text</h3><input type="text" placeholder="Title"><textarea placeholder="Text"></textarea>';
  } else if (type === 'form') {
    div.innerHTML = '<h3>Form</h3><p>Form will include name, phone and email fields.</p>';
  } else if (type === 'social') {
    div.innerHTML = '<h3>Social Links</h3><textarea placeholder="[{\"img\":\"url\",\"name\":\"Name\",\"link\":\"#\"}]\n(one JSON object per line)"></textarea>';
  }
  container.appendChild(div);
});

document.getElementById('pageForm').addEventListener('submit', function (e) {
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
    }
    return null;
  }).filter(Boolean);
  var pages = getPages();
  pages.push({ title: title, url: url, blocks: blocks });
  setPages(pages);
  alert('Page saved');
  location.href = 'index.html';
});

