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
      defComp('config')
        .as(IConfig)
        .build(() => ({ str: 'hello' })),
    );

    const config = await c.get(IConfig);
    expect(config.str).toBe('hello');
  });

  test('registers a component under extra interfaces', async () => {
    const component = defComp('config').build(() => ({ str: 'registered' }));
    const c = new Container().register(component, IConfig);

    const config = await c.get(IConfig);
    expect(config.str).toBe('registered');
  });

  test('registers a component under multiple extra interfaces', async () => {
    const component = defComp('userConfig').build(() => ({
      str: 'multi',
      greet: () => 'hello multi',
    }));
    const c = new Container().register(component, IConfig, IUser);

    const config = await c.get(IConfig);
    const user = await c.get(IUser);

    expect(config.str).toBe('multi');
    expect(user.greet()).toBe('hello multi');
  });

  test('checks interface type when registering extra interfaces', () => {
    const component = defComp('config').build(() => ({ str: 'late' }));

    new Container().register(component, IConfig);

    if (false) {
      // @ts-expect-error config component does not implement user interface
      new Container().register(component, IUser);
    }

    expect(component.tokens).toHaveLength(1);
  });

  test('resolves a component by the component object', async () => {
    const component = defComp('config').build(() => ({ str: 'self' }));
    const c = new Container().register(component);

    const config = await c.get(component);
    expect(config.str).toBe('self');
  });

  test('uses a component as a dependency token', async () => {
    const config = defComp('config').build(() => ({ str: 'token' }));
    const user = defComp('user')
      .provide(config)
      .as(IUser)
      .build((cfg) => ({
        greet: () => `hello ${cfg.str}`,
      }));

    const c = new Container().register(config).register(user);

    const result = await c.get(user);
    expect(result.greet()).toBe('hello token');
  });

  test('resolves a component with one dep', async () => {
    const c = new Container()
      .register(
        defComp('config')
          .as(IConfig)
          .build(() => ({ str: 'world' })),
      )
      .register(
        defComp('user')
          .provide(IConfig)
          .as(IUser)
          .build((config) => ({
            greet: () => `hello ${config.str}`,
          })),
      );

    const user = await c.get(IUser);
    expect(user.greet()).toBe('hello world');
  });

  test('returns the same instance (singleton)', async () => {
    let calls = 0;
    const c = new Container().register(
      defComp('config')
        .as(IConfig)
        .build(() => {
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
      defComp('config')
        .as(IConfig)
        .build(async () => {
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
      defComp('config')
        .as(IConfig)
        .build(async () => {
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
      defComp('opt')
        .as(IOptional)
        .build(() => ({ value: 42 })),
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
    const pluginA = defComp('pluginA').build(() => ({ name: 'A' }));
    const pluginB = defComp('pluginB').build(() => ({ name: 'B' }));

    const c = new Container()
      .register(pluginA, IPlugin.multi)
      .register(pluginB, IPlugin.multi);

    const plugins = await c.get(IPlugin.multi);
    expect(plugins).toHaveLength(2);
    expect(plugins.map((p) => p.name).sort()).toEqual(['A', 'B']);
  });

  test('multi entry receives deps', async () => {
    const pluginA = defComp('pluginA')
      .provide(IConfig)
      .build((config) => ({
        name: `${config.str}-A`,
      }));

    const c = new Container()
      .register(
        defComp('config')
          .as(IConfig)
          .build(() => ({ str: 'prefix' })),
      )
      .register(pluginA, IPlugin.multi);

    const [plugin] = await c.get(IPlugin.multi);
    expect(plugin.name).toBe('prefix-A');
  });

  test('multi dependency is passed as array', async () => {
    const pluginA = defComp('pluginA').build(() => ({ name: 'A' }));
    const pluginB = defComp('pluginB').build(() => ({ name: 'B' }));

    const c = new Container()
      .register(pluginA, IPlugin.multi)
      .register(pluginB, IPlugin.multi)
      .register(
        defComp('config')
          .provide(IPlugin.multi)
          .as(IConfig)
          .build((plugins) => ({
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
    const a = defComp('a').build(() => ({ str: 'a' }));
    const b = defComp('b').build(() => ({ str: 'b' }));

    expect(() =>
      new Container().register(a, IConfig).register(b, IConfig),
    ).toThrow(InterfaceAlreadyRegisteredError);
  });

  test('detects circular dependency', () => {
    const IA = defIntf<object>('A');
    const IB = defIntf<object>('B');

    expect(() =>
      new Container()
        .register(
          defComp('a')
            .provide(IB)
            .as(IA)
            .build(() => ({})),
        )
        .register(
          defComp('b')
            .provide(IA)
            .as(IB)
            .build(() => ({})),
        )
        .get(IA),
    ).toThrow(CircularDependencyError);
  });
});
