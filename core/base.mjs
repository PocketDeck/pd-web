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
      } else if (o.nodeType === Node.TEXT_NODE) {
        if (o.textContent !== n.textContent) o.textContent = n.textContent;
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
  for (const { name, value } of nev.attributes) {
    if (old.getAttribute(name) !== value) old.setAttribute(name, value);
  }
  for (const { name } of old.attributes) {
    if (!nev.hasAttribute(name)) old.removeAttribute(name);
  }

  _morphChildren(old, nev);
  if (old.tagName?.includes("-") && typeof old.onChildrenChanged === "function") {
    old.onChildrenChanged();
  }
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
  #evCleanup = new WeakMap();
  #instanceId = 0;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.silent = structuredClone(this.constructor.props);
    this.state = deepReactive(this.silent, () => this.#requestUpdate());
  }

  querySelector(s) { return this.shadowRoot.querySelector(s); }
  querySelectorAll(s) { return this.shadowRoot.querySelectorAll(s); }
  getElementById(id) { return this.shadowRoot.getElementById(id); }

  static get observedAttributes() {
    return Object.keys(this.props);
  }

  attributeChangedCallback(name, _, value) {
    try { this.state[name] = JSON.parse(value); }
    catch { this.state[name] = value; }
  }

  connectedCallback() {
    this.#mounted = true;
    this.#listenSlot();
    this._update();
    this.mounted();
    this.onMount();
  }

  disconnectedCallback() {
    this.#mounted = false;
    this.#unlistenSlot();
    this._clearEventBindings();
    this.unmounted();
    this.onUnmount();
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

  static get globalStyles() {
    return `:host { -webkit-tap-highlight-color: transparent; user-select: none; }`;
  }

  _skipBodyMorph = false;

  _update() {
    const css = this.constructor.globalStyles + this.styles(this.state);
    if (!this.shadowRoot.getElementById('_body')) {
      this.shadowRoot.innerHTML = `<style id="_style">${css}</style><div id="_body" style="display:contents">${this.render(this.state)}</div>`;
      this._bindEvents(this.shadowRoot);
      this.onRender();
      return;
    }
    const style = this.shadowRoot.getElementById('_style');
    style.textContent = css;
    if (!this._skipBodyMorph) {
      const body = this.shadowRoot.getElementById('_body');
      const tpl = document.createElement('template');
      tpl.innerHTML = this.render(this.state);
      _morphChildren(body, tpl.content);
    }
    this._bindEvents(this.shadowRoot);
    this.onRender();
  }

  render(state) { return ""; }
  styles(state) { return ""; }

  // Lifecycle hooks
  mounted() {}
  unmounted() {}
  onMount() {}
  onUnmount() {}
  onRender() {}
  onChildrenChanged() {}
  onSlotChange(assigned) {}

  // Declarative event binding — use on:click="methodName" in templates
  _bindEvents(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      const prev = this.#evCleanup.get(node);
      if (prev) { prev(); this.#evCleanup.delete(node); }

      const el = node;
      const fns = [];
      const rmed = [];
      for (const attr of [...el.attributes]) {
        if (!attr.name.startsWith("on:")) continue;
        const type = attr.name.slice(3);
        const name = attr.value;
        rmed.push(attr.name);
        const fn = typeof this[name] === "function" ? this[name].bind(this) : null;
        if (fn) {
          el.addEventListener(type, fn);
          fns.push(() => el.removeEventListener(type, fn));
        }
      }
      for (const n of rmed) el.removeAttribute(n);
      if (fns.length) this.#evCleanup.set(el, () => fns.forEach(f => f()));
    }
  }

  _clearEventBindings() {
    if (!this.shadowRoot) return;
    const walker = document.createTreeWalker(this.shadowRoot, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      const cleanup = this.#evCleanup.get(node);
      if (cleanup) { cleanup(); this.#evCleanup.delete(node); }
    }
  }

  // Slot change listener
  #slotHandler = null;
  #listenSlot() {
    const slot = this.shadowRoot?.querySelector("slot");
    if (!slot) return;
    this.#slotHandler = () => this.onSlotChange(slot.assignedElements());
    slot.addEventListener("slotchange", this.#slotHandler);
  }
  #unlistenSlot() {
    if (this.#slotHandler) {
      const slot = this.shadowRoot?.querySelector("slot");
      slot?.removeEventListener("slotchange", this.#slotHandler);
      this.#slotHandler = null;
    }
  }

  on(type, listener, options) {
    if (this.#listeners.has(type)) {
      this.shadowRoot.removeEventListener(type, this.#listeners.get(type));
    }
    this.shadowRoot.addEventListener(type, listener, options);
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
    const walker = document.createTreeWalker(this.shadowRoot, NodeFilter.SHOW_ELEMENT);
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
}
