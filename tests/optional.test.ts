import { describe, expect, test } from 'bun:test';
import { Container, defComp } from '../lib';
import { IOptional } from './fixtures';

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
