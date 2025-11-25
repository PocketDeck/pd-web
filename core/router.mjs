import { getSocket } from '/core/socket.mjs';

function parseRoute(route = '/') {
  const url = new URL(route, location.origin);
  const path = url.pathname.replace(/^\/+|\/+$/g, '') || 'login';
  const params = url.searchParams.entries();
  const hash = url.hash ? url.hash.slice(1) : '';
  const segments = path.split('/');
  const tagName = `${segments[segments.length - 1]}-page`;
  return { path, params, hash, tagName };
}

window.onpopstate = () => renderPage(location.pathname);

async function renderPage(route) {
  const { path, params, tagName } = parseRoute(route);

  await import(`/pages/${path}.mjs`);
  const page = document.createElement(tagName);
  page._pageId = path;

  for (const [k, v] of params) page.setAttribute(k, v);
  if (typeof page.setSocket === 'function') page.setSocket(getSocket());

  const app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(page);
}

export async function navigate(route) {
  await renderPage(route);

  history.pushState(null, '', route);
}
