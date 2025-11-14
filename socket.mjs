export function initSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocol}//${location.hostname}/ws/`);

  socket.addEventListener("open", () => {
    console.log("✅ WebSocket connected");
  });

  socket.addEventListener("close", () => {
    console.log("❌ WebSocket closed");
    // You might want to handle reconnection here
  });

  return socket;
}
