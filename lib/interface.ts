export type IKind = 'singular' | 'multi' | 'optional';

export type IToken<I = any, K extends IKind = IKind> = {
  readonly name: string;
  readonly key: symbol;
  readonly kind: K;
  get _type(): I;
};

export type Interface<I = any, K extends IKind = IKind> = IToken<I, K> & {
  readonly multi: Omit<Interface<I, 'multi'>, 'multi' | 'optional'>;
  readonly optional: Omit<Interface<I, 'optional'>, 'multi' | 'optional'>;
};

export type ImplOf<I extends IToken> = I['_type'];

export type TypeOf<I extends IToken> =
  I extends IToken<infer T, 'multi'>
    ? T[]
    : I extends IToken<infer T, 'optional'>
      ? T | undefined
      : I['_type'];

export type TypeOfTuple<T extends readonly IToken[]> = {
  [K in keyof T]: T[K] extends IToken ? TypeOf<T[K]> : never;
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

function mkIntfBase<I, K extends IKind>(
  name: string,
  symbol: symbol,
  kind: K,
): IToken<I, K> {
  return {
    name,
    key: symbol,
    kind: kind,
    get _type(): I {
      throw new ReferenceError('_type is not callable');
    },
  };
}
