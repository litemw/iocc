import { describe, expect, test } from 'bun:test';
import {
  CircularDependencyError,
  Container,
  InterfaceAlreadyRegisteredError,
  InterfaceNotRegisteredError,
  defComp,
  defIntf,
} from '../lib';
import { IConfig } from './fixtures';

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
