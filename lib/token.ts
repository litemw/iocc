export type Kind = 'singular' | 'multi' | 'optional';

export type Token<T = any, K extends Kind = Kind> = {
  readonly name: string;
  readonly key: symbol;
  readonly kind: K;
  get _type(): T;
};

export type ImplOf<T extends Token> = T['_type'];

export type TypeOf<T extends Token> =
  T extends Token<infer I, 'multi'>
    ? I[]
    : T extends Token<infer I, 'optional'>
      ? I | undefined
      : T['_type'];

export type TypeOfTuple<T extends readonly Token[]> = {
  [K in keyof T]: T[K] extends Token ? TypeOf<T[K]> : never;
};
