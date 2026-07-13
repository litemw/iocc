import { describe, expect, test } from 'bun:test';
import { Container, defComp } from '../lib';
import { IConfig } from './fixtures';

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
