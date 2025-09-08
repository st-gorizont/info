function getMenuNames() {
  const stored = localStorage.getItem('menuNames');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse menu names from localStorage');
    }
  }
  return ['lifestyle', 'photodiary', 'travel', 'music'];
}

function setMenuNames(names) {
  localStorage.setItem('menuNames', JSON.stringify(names));
}

function applyMenuNames(selector) {
  const links = document.querySelectorAll(selector);
  const names = getMenuNames();
  names.forEach((name, idx) => {
    if (links[idx]) {
      links[idx].textContent = name;
    }
  });
}
