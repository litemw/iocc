import { describe, expect, test } from 'bun:test';
import { defComp, defIntf } from '../lib';

describe('_type guard', () => {
  test('accessing _type throws on an interface token', () => {
    const IFoo = defIntf<string>('Foo');
    expect(() => IFoo._type).toThrow(ReferenceError);
  });

  test('accessing _type throws on optional and multi variants', () => {
    const IFoo = defIntf<string>('Foo');
    expect(() => IFoo.optional._type).toThrow(ReferenceError);
    expect(() => IFoo.multi._type).toThrow(ReferenceError);
  });

  test('accessing _type throws on a component', () => {
    const component = defComp('foo').build(() => 'x');
    expect(() => component._type).toThrow(ReferenceError);
  });
});
