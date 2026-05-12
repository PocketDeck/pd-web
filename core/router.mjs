import { getSocket } from "/core/socket.mjs";

function parseRoute(route = "/") {
  const url = new URL(route, location.origin);
  const path = url.pathname.replace(/^\/+|\/+$/g, "") || "login";
  const segments = path.split("/");
  const tagName = `${segments[segments.length - 1]}-page`;
  return { path, tagName };
}

window.onpopstate = () => renderPage(location.pathname);

export async function navigate(route) {
  await renderPage(route);
  history.pushState(null, "", route);
}

async function renderPage(route) {
  const { path, tagName } = parseRoute(route);

  await import(`/pages/${path}.mjs`);
  const page = document.createElement(tagName);
  page._pageId = path;

  if (typeof page.setSocket === "function") page.setSocket(getSocket());

  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(page);
}
