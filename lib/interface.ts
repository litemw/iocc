import { Kind, Token } from './token';

export type Interface<I = any, K extends Kind = Kind> = Token<I, K> & {
  readonly multi: Omit<Interface<I, 'multi'>, 'multi' | 'optional'>;
  readonly optional: Omit<Interface<I, 'optional'>, 'multi' | 'optional'>;
};

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
