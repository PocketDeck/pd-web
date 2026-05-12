function deepReactive(target, callback, seen = new WeakMap()) {
  if (typeof target !== "object" || target === null) return target;
  if (seen.has(target)) return seen.get(target);

  const handler = {
    set(obj, prop, value, receiver) {
      const rv = deepReactive(value, callback, seen);
      const old = obj[prop];
      const res = Reflect.set(obj, prop, rv, receiver);
      if (res && old !== rv) callback(obj, prop, rv);
      return res;
    },
    deleteProperty(obj, prop) {
      const res = Reflect.deleteProperty(obj, prop);
      if (res) callback(obj, prop, undefined);
      return res;
    },
  };

  const proxy = new Proxy(target, handler);
  seen.set(target, proxy);
  return proxy;
}

function _morphChildren(parent, newNodes) {
  const old = [...parent.childNodes];
  const newArr = [...newNodes.childNodes];
  const len = Math.max(old.length, newArr.length);

  for (let i = 0; i < len; i++) {
    const o = old[i];
    const n = newArr[i];

    if (o && n) {
      if (o.nodeType !== n.nodeType || o.nodeName !== n.nodeName) {
        o.replaceWith(document.importNode(n, true));
      } else {
        _morphNode(o, n);
      }
    } else if (o && !n) {
      o.remove();
    } else if (!o && n) {
      parent.appendChild(document.importNode(n, true));
    }
  }
}

function _morphNode(old, nev) {
  if (nev.nodeType === Node.TEXT_NODE) {
    if (old.textContent !== nev.textContent) old.textContent = nev.textContent;
    return;
  }

  for (const { name, value } of nev.attributes) {
    if (old.getAttribute(name) !== value) old.setAttribute(name, value);
  }
  for (const { name } of old.attributes) {
    if (!nev.hasAttribute(name)) old.removeAttribute(name);
  }

  if (old.tagName?.includes("-")) return;
  _morphChildren(old, nev);
}

function _patch(parent, html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  _morphChildren(parent, tpl.content);
}

export class Component extends HTMLElement {
  static props = {};
  #pending = false;
  #mounted = false;
  #listeners = new Map();

  constructor() {
    super();
    this.silent = structuredClone(this.constructor.props);
    this.state = deepReactive(this.silent, () => this.#requestUpdate());
  }

  static get observedAttributes() {
    return Object.keys(this.props);
  }

  attributeChangedCallback(name, _, value) {
    try { this.silent[name] = JSON.parse(value); }
    catch { this.silent[name] = value; }
    if (this.#mounted) this.#requestUpdate();
  }

  connectedCallback() {
    this.#mounted = true;
    if (!this._root) this._root = this.appendChild(document.createElement("div"));
    this._update();
    this.mounted();
  }

  disconnectedCallback() {
    this.#mounted = false;
    this.unmounted();
  }

  setState(partial) {
    Object.assign(this.silent, partial);
    this.#requestUpdate();
  }

  #requestUpdate() {
    if (this.#pending || !this.#mounted) return;
    this.#pending = true;
    queueMicrotask(() => {
      this.#pending = false;
      this._update();
    });
  }

  _update() {
    _patch(this._root, `<style>${this.styles()}</style>${this.render()}`);
  }

  render() { return ""; }
  styles() { return ""; }
  mounted() {}
  unmounted() {}

  on(type, listener, options) {
    if (this.#listeners.has(type)) {
      this.removeEventListener(type, this.#listeners.get(type));
    }
    this.addEventListener(type, listener, options);
    this.#listeners.set(type, listener);
  }

  static registerTag(tag) {
    if (tag && !customElements.get(tag)) customElements.define(tag, this);
  }
}

export class FormComponent extends Component {
  static formAssociated = true;

  constructor() {
    super();
    this._internals = this.attachInternals();
    this.on("input", () => this.checkValidity());
    this.on("change", () => this.checkValidity());
  }

  formAssociatedCallback() {
    this.checkValidity();
  }

  _update() {
    super._update();
    this.checkValidity();
  }

  #getAllFormControls() {
    const result = [];
    const walker = document.createTreeWalker(this._root, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      if (node instanceof FormComponent) {
        result.push(...node.#getAllFormControls());
        continue;
      }
      if (
        typeof node.checkValidity === "function" &&
        typeof node.reportValidity === "function"
      ) {
        result.push(node);
      }
    }
    return result;
  }

  #reduceValidity(cb) {
    for (const el of this.#getAllFormControls()) {
      if (cb(el)) continue;
      this._internals.setValidity({ customError: true }, el.validationMessage || "Invalid", el);
      return false;
    }
    this._internals.setValidity({});
    return true;
  }

  checkValidity() { return this.#reduceValidity(el => el.checkValidity()); }
  reportValidity() { return this.#reduceValidity(el => el.reportValidity()); }
}

export const html = (strings, ...values) => String.raw(
  { raw: strings },
  ...values.map(v => typeof v === "object" && v !== null ? JSON.stringify(v) : v)
);

export const css = String.raw;

import { navigate } from "/core/router.mjs";

export class Page extends Component {
  #socket;
  #messageListeners = new Map();

  connectedCallback() {
    this.style.width = "100vw";
    if (this.#socket) this.#socket.addEventListener("message", this.#onMessage);
    super.connectedCallback();
  }

  disconnectedCallback() {
    if (this.#socket) this.#socket.removeEventListener("message", this.#onMessage);
    super.disconnectedCallback();
  }

  setSocket(socket) { this.#socket = socket; }

  send(data) {
    if (!this.#socket || this.#socket.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket disconnected; Cannot send message!");
      return;
    }
    this.#socket.send(JSON.stringify(data));
  }

  #onMessage = (event) => {
    if (typeof event.data !== "string") {
      event.data.text().then(t => this._handleMessage(t));
      return;
    }
    this._handleMessage(event.data);
  };

  _handleMessage(text) {
    const data = JSON.parse(text);
    if (data.action === "navigate") {
      navigate(data.page);
      return;
    }
    if (this.#messageListeners.has(data.action)) {
      this.#messageListeners.get(data.action)(data);
    }
  };

  onMessage(action, fn) { this.#messageListeners.set(action, fn); }
  navigate(path) { navigate(path); }
}
