import { Component, html as html_, css as css_ } from '/components/base.mjs';
import { navigate } from '/router.mjs'

export class Page extends Component {
  connectedCallback() {
    this._onMessage = (e) => {
      const msg = JSON.parse(e.data);
      this.onMessage(msg);
    };
    this._socket?.addEventListener('message', this._onMessage);
    super.connectedCallback();
  }

  disconnectedCallback() {
    if (this._onMessage && this._socket)
      this._socket.removeEventListener('message', this._onMessage);
    super.disconnectedCallback();
  }

  setSocket(socket) {
    this._socket = socket;
  }


  dispatchMessage(type, msg) {
    if (!this._socket || this._socket.readyState !== WebSocket.OPEN) return;
    const payload = JSON.stringify({
      page: this._pageId,
      type,
      msg,
    });
    console.log(`Sending: ${payload}`);
    this._socket.send(payload);
  }

  onMessage(msg) {
    console.log(`Recieved: ${msg}`);
  }

  navigate(route) {
    navigate(route, this._socket);
  }
}

export const html = html_;
export const css = css_;
