import { describe, expect, test } from 'bun:test';
import { Container, defComp } from '../lib';
import { IConfig } from './fixtures';

describe('hooks', () => {
  test('invokes onRegister, onResolveStart/End and onFactoryStart/End', async () => {
    const calls: string[] = [];
    const c = new Container({
      onRegister: () => calls.push('onRegister'),
      onResolveStart: () => calls.push('onResolveStart'),
      onResolveEnd: () => calls.push('onResolveEnd'),
      onFactoryStart: () => calls.push('onFactoryStart'),
      onFactoryEnd: () => calls.push('onFactoryEnd'),
    });

    c.register(
      defComp('config')
        .as(IConfig)
        .build(() => ({ str: 'hooked' })),
    );

    const config = await c.get(IConfig);

    expect(config.str).toBe('hooked');
    expect(calls).toEqual([
      'onRegister',
      'onResolveStart',
      'onFactoryStart',
      'onFactoryEnd',
      'onResolveEnd',
    ]);
  });
});
