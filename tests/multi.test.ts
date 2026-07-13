import { describe, expect, test } from 'bun:test';
import { Container, defComp } from '../lib';
import { IConfig, IPlugin } from './fixtures';

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
