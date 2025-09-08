document.addEventListener('DOMContentLoaded', async function () {
  applyBanner('#banner');
  applyMenu('.menu a');
  var params = new URLSearchParams(window.location.search);
  var url = params.get('url');
  await applyPage(url);

  var burger = document.querySelector('.burger');
  var menu = document.querySelector('.menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      menu.classList.toggle('active');
    });
  }
});

