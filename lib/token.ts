/** Dependency token resolution mode. */
export type Kind = 'singular' | 'multi' | 'optional';

/** Typed dependency key used by the container to resolve values. */
export type Token<T = any, K extends Kind = Kind> = {
  readonly name: string;
  readonly key: symbol;
  readonly kind: K;
  get _type(): T;
};

/** Extracts the implementation type carried by a token. */
export type ImplOf<T extends Token> = T['_type'];

/** Resolves the runtime value type returned for a token kind. */
export type TypeOf<T extends Token> =
  T extends Token<infer I, 'multi'>
    ? I[]
    : T extends Token<infer I, 'optional'>
      ? I | undefined
      : T['_type'];

/** Maps a tuple of tokens to the tuple of values injected for them. */
export type TypeOfTuple<T extends readonly Token[]> = {
  [K in keyof T]: T[K] extends Token ? TypeOf<T[K]> : never;
};
