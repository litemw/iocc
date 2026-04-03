export type InterfaceKind = 'singular' | 'multi' | 'optional';

export type Interface<I = any, K extends InterfaceKind = InterfaceKind> = {
  readonly name: string;
  readonly _symbol: symbol;
  readonly _kind: K;
  get _type(): I;
  readonly multi: Interface<I[], 'multi'>;
  readonly optional: Interface<I | undefined, 'optional'>;
};

export type TypeOf<I extends Interface> = I['_type'];

export type TypeOfTuple<T extends readonly Interface[]> = {
  [K in keyof T]: T[K] extends Interface<infer I> ? I : never;
};

export function defineInterface<I>(name: string): Interface<I, 'singular'> {
  return _makeInterface<I, 'singular'>(name, Symbol(name), 'singular');
}

function _makeInterface<I, K extends InterfaceKind>(
  name: string,
  symbol: symbol,
  kind: K,
): Interface<I, K> {
  let _multi: Interface<I[], 'multi'> | undefined;
  let _optional: Interface<I | undefined, 'optional'> | undefined;

  return {
    name,
    _symbol: symbol,
    _kind: kind,
    get _type(): I {
      throw new ReferenceError('_type is not callable');
    },
    get multi(): Interface<I[], 'multi'> {
      return (_multi ??= _makeInterface<I[], 'multi'>(
        `${name}[]`,
        symbol,
        'multi',
      ));
    },
    get optional(): Interface<I | undefined, 'optional'> {
      return (_optional ??= _makeInterface<I | undefined, 'optional'>(
        `${name}?`,
        symbol,
        'optional',
      ));
    },
  };
}
