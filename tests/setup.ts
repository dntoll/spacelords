import { afterEach } from 'vitest';

// snabb-testsvit: workers run files without isolation, so each test leaves an
// empty document for the next one, also across files.
if (typeof document !== 'undefined')
  afterEach(() => {
    document.body.replaceChildren();
    document.head.replaceChildren();
  });

// jsdom does not implement native dialog methods; browsers are tested separately.
if (typeof HTMLDialogElement !== 'undefined') {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    writable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    writable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
}
