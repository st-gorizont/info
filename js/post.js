document.addEventListener('DOMContentLoaded', function () {
  applyBanner('#banner');
  applyMenu('.menu a');

  var burger = document.querySelector('.burger');
  var menu = document.querySelector('.menu');
  burger.addEventListener('click', function () {
    menu.classList.toggle('active');
  });

  var params = new URLSearchParams(window.location.search);
  var id = parseInt(params.get('id'), 10);
  var articles = getArticles();
  var article = articles[id];
  if (article) {
    document.getElementById('postTitle').textContent = article.title;
    document.getElementById('postImage').src = article.img;
    document.getElementById('postText').textContent = article.text;
  }
});

