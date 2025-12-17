const container = document.getElementById('window-container');
const menu = document.getElementById('menu');

function toggleMenu() {
  menu.classList.toggle('open');
}

function openApp(app) {
  toggleMenu();

  const win = document.createElement('div');
  win.className = 'window';

  let content = '';

  if (app === 'files') content = '<p>index.html<br>style.css<br>script.js</p>';
  if (app === 'terminal') content = '<p>novaos@user:~$</p>';
  if (app === 'settings') content = '<p>NovaOS v1.0<br>Theme: Dark</p>';

  win.innerHTML = `
    <div class="window-header">${app.toUpperCase()}</div>
    <div class="window-body">${content}</div>
  `;

  container.appendChild(win);
  dragWindow(win);
}

function dragWindow(win) {
  const header = win.querySelector('.window-header');
  let x = 0, y = 0, drag = false;

  header.onmousedown = e => {
    drag = true;
    x = e.clientX - win.offsetLeft;
    y = e.clientY - win.offsetTop;
  };

  document.onmousemove = e => {
    if (!drag) return;
    win.style.left = e.clientX - x + 'px';
    win.style.top = e.clientY - y + 'px';
  };

  document.onmouseup = () => drag = false;
}

setInterval(() => {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString();
}, 1000);