import { describe, expect, test } from 'bun:test';
import { Container, defComp } from '../lib';
import { IConfig, IUser } from './fixtures';

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
