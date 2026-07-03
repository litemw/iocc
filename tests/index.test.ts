import { describe, expect, test } from 'bun:test';
import {
  CircularDependencyError,
  Container,
  InterfaceAlreadyRegisteredError,
  InterfaceNotRegisteredError,
  defComp,
  defIntf,
} from '../lib';

// ── Fixtures ────────────────────────────────────────────────────────────────

const IConfig = defIntf<{ str: string }>('Config');
const IUser = defIntf<{ greet(): string }>('User');
const IPlugin = defIntf<{ name: string }>('Plugin');
const IOptional = defIntf<{ value: number }>('Optional');

// ── Basic resolution ─────────────────────────────────────────────────────────

describe('basic', () => {
  test('resolves a component with no deps', async () => {
    const c = new Container().register(
      defComp('config').as(IConfig)(() => ({ str: 'hello' })),
    );

    const config = await c.get(IConfig);
    expect(config.str).toBe('hello');
  });

  test('adds interface to an already created component', async () => {
    const component = defComp('config')(() => ({ str: 'late' }));
    const c = new Container().register(component.as(IConfig));

    const config = await c.get(IConfig);
    expect(config.str).toBe('late');
  });

  test('checks interface type when adding to an already created component', () => {
    const component = defComp('config')(() => ({ str: 'late' }));

    component.as(IConfig);

    if (false) {
      // @ts-expect-error config component does not implement user interface
      component.as(IUser);
    }

    expect(component.interfaces).toHaveLength(0);
  });

  test('resolves a component with one dep', async () => {
    const c = new Container()
      .register(defComp('config').as(IConfig)(() => ({ str: 'world' })))
      .register(
        defComp('user').provide(IConfig).as(IUser)((config) => ({
          greet: () => `hello ${config.str}`,
        })),
      );

    const user = await c.get(IUser);
    expect(user.greet()).toBe('hello world');
  });

  test('returns the same instance (singleton)', async () => {
    let calls = 0;
    const c = new Container().register(
      defComp('config').as(IConfig)(() => {
        calls++;
        return { str: 'x' };
      }),
    );

    await c.get(IConfig);
    await c.get(IConfig);
    expect(calls).toBe(1);
  });
});

// ── async factory ────────────────────────────────────────────────────────────

describe('async', () => {
  test('resolves async factory', async () => {
    const c = new Container().register(
      defComp('config').as(IConfig)(async () => {
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
      defComp('config').as(IConfig)(async () => {
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
      defComp('opt').as(IOptional)(() => ({ value: 42 })),
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
      .register(defComp('pluginA').as(IPlugin.multi)(() => ({ name: 'A' })))
      .register(defComp('pluginB').as(IPlugin.multi)(() => ({ name: 'B' })));

    const plugins = await c.get(IPlugin.multi);
    expect(plugins).toHaveLength(2);
    expect(plugins.map((p) => p.name).sort()).toEqual(['A', 'B']);
  });

  test('multi entry receives deps', async () => {
    const c = new Container()
      .register(defComp('config').as(IConfig)(() => ({ str: 'prefix' })))
      .register(
        defComp('pluginA').provide(IConfig).as(IPlugin.multi)((config) => ({
          name: `${config.str}-A`,
        })),
      );

    const [plugin] = await c.get(IPlugin.multi);
    expect(plugin.name).toBe('prefix-A');
  });

  test('multi dependency is passed as array', async () => {
    const c = new Container()
      .register(defComp('pluginA').as(IPlugin.multi)(() => ({ name: 'A' })))
      .register(defComp('pluginB').as(IPlugin.multi)(() => ({ name: 'B' })))
      .register(
        defComp('config').provide(IPlugin.multi).as(IConfig)((plugins) => ({
          str: plugins.map((plugin) => plugin.name).join(','),
        })),
      );

    const config = await c.get(IConfig);
    expect(config.str).toBe('A,B');
  });
});

// ── errors ────────────────────────────────────────────────────────────────────

describe('errors', () => {
  test('throws when interface not registered', () => {
    const c = new Container();
    expect(() => c.get(IConfig)).toThrow(InterfaceNotRegisteredError);
  });

  test('throws on duplicate singular registration', () => {
    expect(() =>
      new Container()
        .register(defComp('a').as(IConfig)(() => ({ str: 'a' })))
        .register(defComp('b').as(IConfig)(() => ({ str: 'b' }))),
    ).toThrow(InterfaceAlreadyRegisteredError);
  });

  test('detects circular dependency', () => {
    const IA = defIntf<object>('A');
    const IB = defIntf<object>('B');

    expect(() =>
      new Container()
        .register(defComp('a').provide(IB).as(IA)(() => ({})))
        .register(defComp('b').provide(IA).as(IB)(() => ({})))
        .get(IA),
    ).toThrow(CircularDependencyError);
  });
});
