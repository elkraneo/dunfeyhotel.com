// <dh-chips> — the one chip-group implementation. Every chip row on the
// site (front desk, observatory controls, view toggles, resource types)
// gets selection state, aria-pressed and keyboard behavior from here.
//
//   <dh-chips class="chip-row" mode="single" aria-label="Collect as">
//     <button type="button" class="chip" data-value="sessions">Sessions</button>
//   </dh-chips>
//
// mode="single" (default): one value at a time — read/write the `value`
//   property; `change` fires with detail.value. The `value` attribute
//   seeds the initial selection for statically authored groups.
// mode="multi": a Set of values — read/write the `values` property;
//   detail.values is a Set of strings. A button with data-value="" is the
//   clear-all chip: pressing it empties the selection, and it shows as
//   pressed while nothing is selected. While a selection exists the
//   element carries `data-filtered`, which dims unselected chips.
//
// Buttons may be authored statically or appended later (a MutationObserver
// picks them up). One tab stop per group; arrow keys move between chips,
// Home/End jump. Setting value/values re-renders without firing `change`;
// only user presses fire it.

class DhChips extends HTMLElement {
  #values = new Set();
  #observer = null;

  connectedCallback() {
    this.#upgrade("value");
    this.#upgrade("values");
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    if (!this.#values.size && this.hasAttribute("value")) {
      this.#values = new Set([this.getAttribute("value")]);
    }
    this.addEventListener("click", this.#onClick);
    this.addEventListener("keydown", this.#onKeydown);
    this.#observer = new MutationObserver(() => this.#render());
    this.#observer.observe(this, { childList: true, subtree: true });
    this.#render();
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
  }

  // A property set before the element was defined lands as an own property
  // that would shadow the accessor — replay it through the setter.
  #upgrade(prop) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const v = this[prop];
      delete this[prop];
      this[prop] = v;
    }
  }

  get #single() {
    return (this.getAttribute("mode") ?? "single") === "single";
  }

  get #buttons() {
    return [...this.querySelectorAll("button[data-value]")];
  }

  get value() {
    return this.#values.values().next().value ?? null;
  }

  set value(v) {
    this.#values = v == null ? new Set() : new Set([String(v)]);
    this.#render();
  }

  get values() {
    return new Set(this.#values);
  }

  set values(iterable) {
    this.#values = new Set([...iterable].map(String));
    this.#render();
  }

  #onClick = (e) => {
    const b = e.target.closest("button[data-value]");
    if (!b || !this.contains(b)) return;
    const v = b.dataset.value;
    if (this.#single) {
      if (this.#values.has(v)) return;
      this.#values = new Set([v]);
    } else if (v === "") {
      this.#values.clear();
    } else {
      this.#values.has(v) ? this.#values.delete(v) : this.#values.add(v);
    }
    this.#render();
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { value: this.value, values: this.values },
      })
    );
  };

  #onKeydown = (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step === undefined && e.key !== "Home" && e.key !== "End") return;
    const buttons = this.#buttons.filter((b) => !b.hidden);
    const i = buttons.indexOf(document.activeElement);
    if (!buttons.length || i < 0) return;
    e.preventDefault();
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? buttons.length - 1
          : (i + step + buttons.length) % buttons.length;
    buttons.forEach((b, j) => (b.tabIndex = j === next ? 0 : -1));
    buttons[next].focus();
  };

  #render() {
    const buttons = this.#buttons;
    const empty = this.#values.size === 0;
    for (const b of buttons) {
      const v = b.dataset.value;
      const pressed = !this.#single && v === "" ? empty : this.#values.has(v);
      b.setAttribute("aria-pressed", String(pressed));
    }
    if (!this.#single) this.toggleAttribute("data-filtered", !empty);
    // Roving tabindex: keep the stop where focus is; otherwise the first
    // pressed chip; otherwise the first chip.
    const stop =
      buttons.find((b) => b === document.activeElement) ??
      buttons.find((b) => b.getAttribute("aria-pressed") === "true") ??
      buttons[0];
    buttons.forEach((b) => (b.tabIndex = b === stop ? 0 : -1));
  }
}

if (!customElements.get("dh-chips")) customElements.define("dh-chips", DhChips);
