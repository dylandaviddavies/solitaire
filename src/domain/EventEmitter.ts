type Listener<T> = (payload: T) => void

/**
 * Minimal typed pub-sub. Used by `GameEngine` so it never has to know that
 * React (or anything else) is listening — the engine stays a plain,
 * framework-agnostic domain object (Dependency Inversion: the UI depends
 * on this abstraction, the engine depends on nothing).
 */
export class EventEmitter<EventMap extends Record<string, unknown>> {
  private listeners: { [K in keyof EventMap]?: Set<Listener<EventMap[K]>> } = {}

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): () => void {
    const set = (this.listeners[event] ??= new Set())
    set.add(listener)
    return () => set.delete(listener)
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.listeners[event]?.forEach((listener) => listener(payload))
  }
}
