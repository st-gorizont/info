document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var user = document.getElementById('username').value;
  var pass = document.getElementById('password').value;
  if (user === 'admin' && pass === 'vider') {
    document.getElementById('login').style.display = 'none';
    document.getElementById('editor').style.display = 'block';
    var names = getMenuNames();
    var inputs = document.querySelectorAll('#menuForm input');
    inputs.forEach(function (input, idx) {
      input.value = names[idx] || '';
    });
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
});

document.getElementById('menuForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var inputs = document.querySelectorAll('#menuForm input');
  var names = Array.from(inputs).map(function (input) {
    return input.value.trim();
  });
  setMenuNames(names);
  alert('Saved');
});
