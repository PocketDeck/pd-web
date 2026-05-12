let socket = null;
let reconnectTimer = null;
let reconnectDelay = 1000;

function connect() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const port = location.port ? ':' + location.port : '';
  socket = new WebSocket(`${protocol}//${location.hostname}${port}/ws/`);

  socket.addEventListener("open", () => {
    reconnectDelay = 1000;
    document.dispatchEvent(new CustomEvent("ws:connected"));
  });

  socket.addEventListener("close", () => {
    document.dispatchEvent(new CustomEvent("ws:disconnected", { detail: { willReconnect: true } }));
    scheduleReconnect();
  });

  socket.addEventListener("error", () => socket?.close());
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    connect();
    reconnectDelay = Math.min(reconnectDelay * 2, 30000);
  }, reconnectDelay);
}

export function initSocket() {
  if (!socket) connect();
  return socket;
}

export function getSocket() {
  return socket;
}
