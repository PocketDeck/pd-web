export class Component extends HTMLElement {
  static defaultProps = {};

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._mounted = false;
    this.silentProps = structuredClone(this.constructor.defaultProps);
    this.props = this.#makeReactive(this.silentProps);
    this.propsHTML = new Proxy(this.silentProps, {
      get: (target, prop) => {
        const val = target[prop];
        return val !== null && typeof val === 'object'
          ? this._toHtmlAttr(target[prop])
          : target[prop];
      }
    });
  }

  static get observedAttributes() {
    return Object.keys(this.defaultProps);
  }

  _toHtmlAttr(obj) {
    return btoa(encodeURIComponent(JSON.stringify(obj)));
  }

  _fromHtmlAttr(str) {
    return JSON.parse(decodeURIComponent(atob(str)));
  }

  connectedCallback() {
    this._mounted = true;
    this._update();
    this.mounted();
  }

  disconnectedCallback() {
    this.unmounted();
    this._mounted = false;
  }

  attributeChangedCallback(name, _, newVal) {
    try {
      this.props[name] = this._fromHtmlAttr(newVal);
    } catch {
      this.props[name] = newVal;
    }
  }

  #makeReactive(obj) {
    return new Proxy(obj, {
      set: (target, key, value) => {
        if (target[key] === value) return true;
        target[key] = value;
        this._update();
        return true;
      }
    });
  }

  setState(state) {
    Object.assign(this.silentProps, state);
    this._update();
  }

  _update() {
    if (!this._mounted) return;
    this.shadowRoot.innerHTML = `
      <style>${this.styles()}</style>
      ${this.render()}
    `;
  }

  render() { return ''; }
  styles() { return ''; }
  mounted() {}
  unmounted() {}

  addShadowListener(type, listener, options) {
    this.shadowRoot.addEventListener(type, listener, options);
  }

  removeShadowListener(type, listener, options) {
    this.shadowRoot.removeEventListener(type, listener, options);
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

    this.addShadowListener('input', () => this.checkValidity());
    this.addShadowListener('change', () => this.checkValidity());
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

      if (typeof node.checkValidity === 'function'
        && typeof node.reportValidity === 'function'
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

export const html = (strings, ...values) => String.raw({ raw: strings}, ...values);
export const css = html;
