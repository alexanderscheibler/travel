// Touch and TouchEvent are not implemented in jsdom — polyfill them
if (typeof Touch === 'undefined') {
    globalThis.Touch = class Touch {
        constructor({ target, clientX = 0, clientY = 0 }) {
            this.target     = target;
            this.clientX    = clientX;
            this.clientY    = clientY;
        }
    };
}

if (typeof TouchEvent === 'undefined') {
    globalThis.TouchEvent = class TouchEvent extends Event {
        constructor(type, init = {}) {
            super(type, init);
            this.changedTouches = init.changedTouches ?? [];
        }
    };
}