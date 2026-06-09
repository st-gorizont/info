document.addEventListener('DOMContentLoaded', async function () {
  applyMenu('.menu ul');
  var params = new URLSearchParams(window.location.search);
  var url = params.get('url');
  await applyPage(url || 'index');

  var burger = document.querySelector('.burger');
  var menu = document.querySelector('.menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      menu.classList.toggle('active');
    });
  }
});
