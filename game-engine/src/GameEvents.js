"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEventBus = void 0;
class GameEventBus {
    constructor() {
        this.listeners = new Map();
    }
    on(event, handler) {
        const existing = this.listeners.get(event) ?? [];
        this.listeners.set(event, [...existing, handler]);
    }
    off(event, handler) {
        const existing = this.listeners.get(event) ?? [];
        this.listeners.set(event, existing.filter((h) => h !== handler));
    }
    emit(event, payload) {
        const handlers = this.listeners.get(event) ?? [];
        handlers.forEach((h) => h(payload));
    }
}
exports.GameEventBus = GameEventBus;
//# sourceMappingURL=GameEvents.js.map