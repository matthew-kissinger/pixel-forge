/**
 * Typed publish/subscribe bus.
 *
 * Tiny event-bus primitive. Pattern lifted from chili3d (AGPL — patterns
 * only, this implementation is original) so commands, render-pipeline
 * lifecycle events, executor progress, and CLI/MCP tooling can subscribe
 * symmetrically without going through React state.
 *
 * Each bus is a discrete instance — there is no global. Pass a bus through
 * to subscribers explicitly. That keeps tests deterministic and avoids
 * leaking handlers across feature boundaries.
 *
 * @example
 *   type Events = {
 *     'render:start': { id: string };
 *     'render:done':  { id: string; durationMs: number };
 *     'render:error': { id: string; error: Error };
 *   };
 *
 *   const bus = createPubSub<Events>();
 *   const unsub = bus.subscribe('render:done', (p) => console.log(p.durationMs));
 *   bus.publish('render:done', { id: 'a', durationMs: 42 });
 *   unsub();
 */

export type EventMap = Record<string, unknown>;

export type Handler<P> = (payload: P) => void;

export interface PubSub<E extends EventMap> {
  /**
   * Subscribe to an event. Returns an unsubscribe thunk — call it to detach
   * the handler. Calling the returned function more than once is a no-op.
   */
  subscribe<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void;

  /**
   * Publish an event to every current subscriber. Handlers are invoked
   * synchronously in subscription order. A handler that throws is caught
   * and logged via the optional onHandlerError hook (or `console.error`
   * fallback) so a single bad listener cannot break sibling handlers.
   */
  publish<K extends keyof E>(event: K, payload: E[K]): void;

  /**
   * Drop all subscribers. Handy in tests and on long-lived bus replacement.
   */
  clear(): void;

  /**
   * Number of subscribers for an event. Primarily useful for assertions.
   */
  listenerCount<K extends keyof E>(event: K): number;
}

export interface CreatePubSubOptions {
  /**
   * Hook called when a handler throws. Defaults to `console.error`. Pass
   * `() => {}` to silence.
   */
  onHandlerError?: (event: string, error: unknown) => void;
}

export function createPubSub<E extends EventMap>(
  opts: CreatePubSubOptions = {}
): PubSub<E> {
  const onHandlerError =
    opts.onHandlerError ??
    ((event, error) => {
      // eslint-disable-next-line no-console
      console.error(`[pubsub] handler for "${event}" threw:`, error);
    });

  const handlers = new Map<keyof E, Set<Handler<unknown>>>();

  function subscribe<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    let set = handlers.get(event);
    if (!set) {
      set = new Set();
      handlers.set(event, set);
    }
    set.add(handler as Handler<unknown>);
    let unsubbed = false;
    return () => {
      if (unsubbed) return;
      unsubbed = true;
      const s = handlers.get(event);
      if (!s) return;
      s.delete(handler as Handler<unknown>);
      if (s.size === 0) handlers.delete(event);
    };
  }

  function publish<K extends keyof E>(event: K, payload: E[K]): void {
    const set = handlers.get(event);
    if (!set || set.size === 0) return;
    // Snapshot so unsubscribe-during-publish is safe.
    const snapshot = Array.from(set);
    for (const h of snapshot) {
      try {
        (h as Handler<E[K]>)(payload);
      } catch (err) {
        onHandlerError(String(event), err);
      }
    }
  }

  function clear(): void {
    handlers.clear();
  }

  function listenerCount<K extends keyof E>(event: K): number {
    return handlers.get(event)?.size ?? 0;
  }

  return { subscribe, publish, clear, listenerCount };
}
