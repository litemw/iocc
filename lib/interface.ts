import { Kind, Token } from './token';

/** Named dependency interface with optional and multi-token variants. */
export type Interface<I = any, K extends Kind = Kind> = Token<I, K> & {
  /** Variant that resolves all registered implementations as an array. */
  readonly multi: Omit<Interface<I, 'multi'>, 'multi' | 'optional'>;
  /** Variant that resolves to undefined when no implementation is registered. */
  readonly optional: Omit<Interface<I, 'optional'>, 'multi' | 'optional'>;
};

/**
 * Creates a typed dependency interface identified by a unique symbol.
 *
 * @param name Name used in diagnostics and derived variant names.
 * @returns A singular interface token with optional and multi variants.
 */
export function defIntf<I>(name: string): Interface<I, 'singular'> {
  return mkIntf<I>(name, Symbol(name));
}

function mkIntf<I>(name: string, symbol: symbol): Interface<I, 'singular'> {
  return {
    name,
    key: symbol,
    kind: 'singular',
    get _type(): I {
      throw new ReferenceError('_type is not callable');
    },
    multi: mkIntfBase<I, 'multi'>(`${name}[]`, symbol, 'multi'),
    optional: mkIntfBase<I, 'optional'>(`${name}?`, symbol, 'optional'),
  };
}

function mkIntfBase<I, K extends Kind>(
  name: string,
  symbol: symbol,
  kind: K,
): Token<I, K> {
  return {
    name,
    key: symbol,
    kind: kind,
    get _type(): I {
      throw new ReferenceError('_type is not callable');
    },
  };
}
