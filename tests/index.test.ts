import { describe, expect, test } from 'bun:test';
import { Container, defineComponent, defineInterface } from '../lib';

// ── Fixtures ────────────────────────────────────────────────────────────────

const IConfig = defineInterface<{ str: string }>('Config');
const IUser = defineInterface<{ greet(): string }>('User');
const IPlugin = defineInterface<{ name: string }>('Plugin');
const IOptional = defineInterface<{ value: number }>('Optional');

// ── Basic resolution ─────────────────────────────────────────────────────────

describe('basic', () => {
  test('resolves a component with no deps', async () => {
    const c = new Container().register(
      defineComponent('config').as(IConfig)(() => ({ str: 'hello' })),
    );

    const config = await c.get(IConfig);
    expect(config.str).toBe('hello');
  });

  test('resolves a component with one dep', async () => {
    const c = new Container()
      .register(defineComponent('config').as(IConfig)(() => ({ str: 'world' })))
      .register(
        defineComponent('user').provide(IConfig).as(IUser)((config) => ({
          greet: () => `hello ${config.str}`,
        })),
      );

    const user = await c.get(IUser);
    expect(user.greet()).toBe('hello world');
  });

  test('returns the same instance (singleton)', async () => {
    let calls = 0;
    const c = new Container().register(
      defineComponent('config').as(IConfig)(() => {
        calls++;
        return { str: 'x' };
      }),
    );

    await c.get(IConfig);
    await c.get(IConfig);
    expect(calls).toBe(1);
  });
});

// ── supply ───────────────────────────────────────────────────────────────────

describe('supply', () => {
  test('resolves a supplied value', async () => {
    const c = new Container().supply(IConfig, { str: 'supplied' });
    const config = await c.get(IConfig);
    expect(config.str).toBe('supplied');
  });

  test('supplied value used as dep', async () => {
    const c = new Container().supply(IConfig, { str: 'supplied' }).register(
      defineComponent('user').provide(IConfig).as(IUser)((config) => ({
        greet: () => config.str,
      })),
    );

    const user = await c.get(IUser);
    expect(user.greet()).toBe('supplied');
  });
});

// ── async factory ────────────────────────────────────────────────────────────

describe('async', () => {
  test('resolves async factory', async () => {
    const c = new Container().register(
      defineComponent('config').as(IConfig)(async () => {
        await Promise.resolve();
        return { str: 'async' };
      }),
    );

    const config = await c.get(IConfig);
    expect(config.str).toBe('async');
  });

  test('async factory called only once (singleton)', async () => {
    let calls = 0;
    const c = new Container().register(
      defineComponent('config').as(IConfig)(async () => {
        calls++;
        await Promise.resolve();
        return { str: 'x' };
      }),
    );

    await Promise.all([c.get(IConfig), c.get(IConfig)]);
    expect(calls).toBe(1);
  });
});

// ── optional ─────────────────────────────────────────────────────────────────

describe('optional', () => {
  test('returns undefined when not registered', async () => {
    const c = new Container();
    const result = await c.get(IOptional.optional);
    expect(result).toBeUndefined();
  });

  test('returns value when registered', async () => {
    const c = new Container().register(
      defineComponent('opt').as(IOptional)(() => ({ value: 42 })),
    );

    const result = await c.get(IOptional.optional);
    expect(result?.value).toBe(42);
  });
});

// ── multi ─────────────────────────────────────────────────────────────────────

describe('multi', () => {
  test('returns empty array when nothing registered', async () => {
    const c = new Container();
    const plugins = await c.get(IPlugin.multi);
    expect(plugins).toEqual([]);
  });

  test('collects all registered implementations', async () => {
    const c = new Container()
      .register(
        defineComponent('pluginA').as(IPlugin.multi)(() => ({ name: 'A' })),
      )
      .register(
        defineComponent('pluginB').as(IPlugin.multi)(() => ({ name: 'B' })),
      );

    const plugins = await c.get(IPlugin.multi);
    expect(plugins).toHaveLength(2);
    expect(plugins.map((p) => p.name).sort()).toEqual(['A', 'B']);
  });

  test('multi entry receives deps', async () => {
    const c = new Container()
      .supply(IConfig, { str: 'prefix' })
      .register(
        defineComponent('pluginA').provide(IConfig).as(IPlugin.multi)(
          (config) => ({ name: `${config.str}-A` }),
        ),
      );

    const [plugin] = await c.get(IPlugin.multi);
    expect(plugin.name).toBe('prefix-A');
  });
});

// ── errors ────────────────────────────────────────────────────────────────────

describe('errors', () => {
  test('throws when interface not registered', () => {
    const c = new Container();
    expect(() => c.get(IConfig)).toThrow('not registered');
  });

  test('throws on duplicate singular registration', () => {
    expect(() =>
      new Container()
        .register(defineComponent('a').as(IConfig)(() => ({ str: 'a' })))
        .register(defineComponent('b').as(IConfig)(() => ({ str: 'b' }))),
    ).toThrow('already registered');
  });

  test('throws on duplicate supply', () => {
    expect(() =>
      new Container()
        .supply(IConfig, { str: 'a' })
        .supply(IConfig, { str: 'b' }),
    ).toThrow('already registered');
  });

  test('detects circular dependency', () => {
    const IA = defineInterface<object>('A');
    const IB = defineInterface<object>('B');

    expect(() =>
      new Container()
        .register(defineComponent('a').provide(IB).as(IA)(() => ({})))
        .register(defineComponent('b').provide(IA).as(IB)(() => ({})))
        .get(IA),
    ).toThrow('Circular dependency');
  });
});
