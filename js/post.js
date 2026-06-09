document.addEventListener('DOMContentLoaded', function () {
  applyMenu('.menu ul');

  var burger = document.querySelector('.burger');
  var menu = document.querySelector('.menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      menu.classList.toggle('active');
    });
  }

  var params = new URLSearchParams(window.location.search);
  var id = parseInt(params.get('id'), 10);
  var articles = getArticles();
  var article = articles[id];
  if (article) {
    document.getElementById('postTitle').textContent = article.title;
    document.getElementById('postImage').src = article.img;
    document.getElementById('postText').textContent = article.text;
  } else {
    document.getElementById('postTitle').textContent = 'Оголошення тимчасово недоступне';
    document.getElementById('postImage').style.display = 'none';
    document.getElementById('postText').textContent = 'Поверніться на головну сторінку або відкрийте актуальне оголошення зі списку новин.';
  }
});
