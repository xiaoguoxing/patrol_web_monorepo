export type EventHandler<T = unknown> = ((data: T) => void) & { once?: boolean };

export class UiEvent {
  handler: Record<string, EventHandler[]> = {};

  on<T = unknown>(type: string, handler: EventHandler<T>, once = false): void {
    const handlers = (this.handler[type] ??= []);
    if (!handlers.includes(handler as EventHandler)) {
      if (once) handler.once = true;
      handlers.push(handler as EventHandler);
    }
  }

  trigger<T = unknown>(type: string, data = {} as T, context: unknown = this): void {
    this.handler[type]?.slice().forEach((handler) => {
      handler.call(context, data);
      if (handler.once) this.off(type, handler);
    });
  }

  off(type: string, handler?: EventHandler): void {
    if (!handler) {
      this.handler[type] = [];
      return;
    }
    this.handler[type] = (this.handler[type] ?? []).filter((item) => item !== handler);
  }

  offAll(): void {
    this.handler = {};
  }

  once<T = unknown>(type: string, handler: EventHandler<T>): void {
    this.on(type, handler, true);
  }
}
