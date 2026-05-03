import { describe, expect, test } from 'bun:test';
import { createPubSub } from '../pubsub';

interface Events {
  'render:start': { id: string };
  'render:done': { id: string; durationMs: number };
  'count:tick': number;
}

describe('createPubSub', () => {
  test('subscribe + publish delivers payload to handler', () => {
    const bus = createPubSub<Events>();
    let captured: Events['render:done'] | null = null;
    bus.subscribe('render:done', (p) => {
      captured = p;
    });
    bus.publish('render:done', { id: 'a', durationMs: 12 });
    expect(captured).toEqual({ id: 'a', durationMs: 12 });
  });

  test('multiple subscribers all fire in subscription order', () => {
    const bus = createPubSub<Events>();
    const order: string[] = [];
    bus.subscribe('count:tick', (n) => order.push(`first:${n}`));
    bus.subscribe('count:tick', (n) => order.push(`second:${n}`));
    bus.publish('count:tick', 7);
    expect(order).toEqual(['first:7', 'second:7']);
  });

  test('unsubscribe stops further deliveries to that handler', () => {
    const bus = createPubSub<Events>();
    let count = 0;
    const unsub = bus.subscribe('count:tick', () => {
      count++;
    });
    bus.publish('count:tick', 1);
    bus.publish('count:tick', 2);
    unsub();
    bus.publish('count:tick', 3);
    expect(count).toBe(2);
  });

  test('unsubscribe is idempotent', () => {
    const bus = createPubSub<Events>();
    let count = 0;
    const unsub = bus.subscribe('count:tick', () => {
      count++;
    });
    unsub();
    unsub(); // no throw
    bus.publish('count:tick', 1);
    expect(count).toBe(0);
  });

  test('publishing with no subscribers is a no-op', () => {
    const bus = createPubSub<Events>();
    expect(() => bus.publish('render:start', { id: 'x' })).not.toThrow();
  });

  test('publish keeps publish-time snapshot — unsubscribe during dispatch is safe', () => {
    const bus = createPubSub<Events>();
    const calls: string[] = [];
    let unsubB: () => void = () => {};
    bus.subscribe('count:tick', () => {
      calls.push('a');
      unsubB();
    });
    unsubB = bus.subscribe('count:tick', () => {
      calls.push('b');
    });
    bus.publish('count:tick', 1);
    // Both 'a' and 'b' fire on the first publish (snapshot taken
    // before any handler ran). Then 'b' is unsubscribed.
    expect(calls).toEqual(['a', 'b']);
    bus.publish('count:tick', 2);
    expect(calls).toEqual(['a', 'b', 'a']);
  });

  test('handler errors do not break sibling handlers', () => {
    const errors: Array<[string, unknown]> = [];
    const bus = createPubSub<Events>({
      onHandlerError: (event, err) => errors.push([event, err]),
    });
    let secondCalled = false;
    bus.subscribe('count:tick', () => {
      throw new Error('boom');
    });
    bus.subscribe('count:tick', () => {
      secondCalled = true;
    });
    bus.publish('count:tick', 1);
    expect(secondCalled).toBe(true);
    expect(errors.length).toBe(1);
    expect(errors[0]![0]).toBe('count:tick');
    expect((errors[0]![1] as Error).message).toBe('boom');
  });

  test('listenerCount tracks subscriptions', () => {
    const bus = createPubSub<Events>();
    expect(bus.listenerCount('render:start')).toBe(0);
    const unsub1 = bus.subscribe('render:start', () => {});
    bus.subscribe('render:start', () => {});
    expect(bus.listenerCount('render:start')).toBe(2);
    expect(bus.listenerCount('render:done')).toBe(0);
    unsub1();
    expect(bus.listenerCount('render:start')).toBe(1);
  });

  test('clear drops all subscribers across all events', () => {
    const bus = createPubSub<Events>();
    bus.subscribe('render:start', () => {});
    bus.subscribe('render:done', () => {});
    bus.subscribe('count:tick', () => {});
    expect(bus.listenerCount('render:start')).toBe(1);
    bus.clear();
    expect(bus.listenerCount('render:start')).toBe(0);
    expect(bus.listenerCount('render:done')).toBe(0);
    expect(bus.listenerCount('count:tick')).toBe(0);
  });

  test('events are isolated by key — wrong-key publishes do not deliver', () => {
    const bus = createPubSub<Events>();
    let startCount = 0;
    bus.subscribe('render:start', () => {
      startCount++;
    });
    bus.publish('render:done', { id: 'x', durationMs: 1 });
    expect(startCount).toBe(0);
  });

  test('two bus instances are independent', () => {
    const a = createPubSub<Events>();
    const b = createPubSub<Events>();
    let aCount = 0;
    let bCount = 0;
    a.subscribe('count:tick', () => aCount++);
    b.subscribe('count:tick', () => bCount++);
    a.publish('count:tick', 1);
    expect(aCount).toBe(1);
    expect(bCount).toBe(0);
  });
});
