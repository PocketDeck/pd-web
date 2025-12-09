import { store } from '/core/store.mjs'

function deepReactive(target, callback, seen = new WeakMap()) {
  if (typeof target !== 'object' || target === null) return target;
  if (seen.has(target)) return seen.get(target);

  const handler = {
    set(obj, prop, value, receiver) {
      const reactiveValue = deepReactive(value, callback, seen);
      const oldValue = obj[prop];
      const result = Reflect.set(obj, prop, reactiveValue, receiver);
      if (result && oldValue !== reactiveValue) callback(obj, prop, reactiveValue);
      return result;
    },
    deleteProperty(obj, prop) {
      const result = Reflect.deleteProperty(obj, prop);
      if (result) callback(obj, prop, undefined);
      return result;
    }
  };

  // TODO: handle Map and Set

  const proxy = new Proxy(target, handler);
  seen.set(target, proxy);
  return proxy;
}

function deepReactiveClone(obj) {
  if (obj instanceof Map) return Object.fromEntries(obj);
  if (obj instanceof Set) return [...obj];
  if (typeof obj !== 'object' || obj === null) return obj;

  const plain = {};
  for (const key in obj) {
    plain[key] = deepReactiveClone(obj[key]);
  }
  return plain;
}

export class Component extends HTMLElement {
  static props = {};
  #mounted = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.silentProps = structuredClone(this.constructor.props);
    this.props = deepReactive(this.silentProps, this._update.bind(this));
  }

  static get observedAttributes() {
    return Object.keys(this.props);
  }

  connectedCallback() {
    this.#mounted = true;
    this._update();
    this.mounted({
      on: this.on.bind(this),
      dispatchEvent: this.dispatchEvent.bind(this),
    });
  }

  disconnectedCallback() {
    this.#mounted = false;
    this.unmounted();
  }

  attributeChangedCallback(name, _, newVal) {
    if (store.has(newVal)) {
      this.props[name] = store.get(newVal);
      store.delete(newVal);
    } else {
      this.props[name] = newVal;
    }
  }

  setState(state) {
    Object.assign(this.silentProps, state);
    this._update();
  }

  _update() {
    if (!this.#mounted) return;
    this.shadowRoot.innerHTML = `
      <style>${this.styles(this)}</style>
      ${this.render(this)}
    `;
  }

  render() { return ''; }
  styles() { return ''; }
  mounted() {}
  unmounted() {}

  #listeners = new Map();
  on(type, listener, options) {
    if (this.#listeners.has(type)) {
      this.shadowRoot.removeEventListener(type, this.#listeners.get(type));
    }
    this.shadowRoot.addEventListener(type, listener, options);
    this.#listeners.set(type, listener);
  }

  static registerTag(tag) {
    if (tag && !customElements.get(tag))
      customElements.define(tag, this);
  }
}

export class FormComponent extends Component {
  static formAssociated = true;

  constructor() {
    super();
    this._internals = this.attachInternals();

    this.on('input', () => this.checkValidity());
    this.on('change', () => this.checkValidity());
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

      if (typeof node.checkValidity === 'function' &&
        typeof node.reportValidity === 'function'
      ) {
        result.push(node);
      }
    }
    return result;
  }

  #reduceValidity(cb) {
    for (const el of this.#getAllFormControls()) {
      if (cb(el)) continue;
      this._internals.setValidity({ customError: true }, el.validationMessage || 'Invalid', el)
      return false;
    }

    this._internals.setValidity({});
    return true;
  }

  checkValidity() {
    return this.#reduceValidity((el) => el.checkValidity());
  }
  reportValidity() {
    return this.#reduceValidity((el) => el.reportValidity());
  }
}

export const html = (strings, ...values) => {
  const processedValues = values.map(value => {
    if (typeof value === 'object' && value !== null) {
      const uuid = crypto.randomUUID();
      store.set(uuid, deepReactiveClone(value));
      return uuid;
    }
    return value;
  });

  return String.raw({ raw: strings }, ...processedValues);
};
export const css = String.raw;


import { navigate } from '/core/router.mjs'
export class Page extends Component {
  #socket;

  connectedCallback() {
    this.#socket?.addEventListener('message', this.#onMessage);
    super.connectedCallback();
  }

  disconnectedCallback() {
    if (this._onMessage && this.#socket)
      this.#socket.removeEventListener('message', this.#onMessage);
    super.disconnectedCallback();
  }

  setSocket(socket) {
    this.#socket = socket;
  }

  dispatchMessage(type, msg) {
    if (!this.#socket || this.#socket.readyState !== WebSocket.OPEN) return;
    const payload = JSON.stringify({
      page: this._pageId,
      type,
      msg,
    });
    console.log(`Sending: ${payload}`);
    this.#socket.send(payload);
  }

  #messageListeners = new Map();

  #onMessage(event) {
    const payload = JSON.parse(event.data);
    if (payload.type === 'navigate') {
      navigate(payload.msg.page, this.#socket);
    } else {
      this.#messageListeners.get(payload.type)?.(payload.msg);
    }
  }

  onMessage(type, listener) {
    this.#messageListeners.set(type, listener);
  }
}
