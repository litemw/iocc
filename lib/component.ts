import { ImplOf, Token, TypeOfTuple } from './token';

/** Component descriptor that can provide its own token and declared interfaces. */
export type Component<
  Deps extends readonly Token[] = readonly Token[],
  Ret = unknown,
> = Token<Ret, 'singular'> & {
  /** Tokens this component is registered under, including its own token. */
  readonly tokens: readonly Token[];

  /** Dependency tokens passed to the factory in declaration order. */
  readonly deps: Deps;

  /** Creates the component value from resolved dependency values. */
  readonly factory: (...args: any[]) => Ret | Promise<Ret>;
};

/** Fluent builder used to declare dependencies, interfaces, and a factory. */
export type ComponentBuilder<
  Deps extends readonly Token[] = [],
  AsType = unknown,
> = {
  /**
   * Appends dependency tokens for the component factory.
   *
   * @param deps Tokens resolved and passed to the factory in the same order.
   * @returns A builder carrying the extended dependency tuple.
   */
  provide<P extends readonly Token[]>(
    ...deps: P
  ): ComponentBuilder<[...Deps, ...P], AsType>;

  /**
   * Declares an interface implemented by the component value.
   *
   * @param i Interface token the factory result must satisfy.
   * @returns A builder constrained to factories returning that interface type.
   */
  as<I extends Token>(i: I): ComponentBuilder<Deps, AsType & ImplOf<I>>;
  /**
   * Finalizes the component declaration with a factory.
   *
   * @param factory Function receiving resolved dependencies and returning a value.
   * @returns A component descriptor ready to register in a container.
   */
  build<R extends AsType>(
    factory: (...args: TypeOfTuple<Deps>) => R | Promise<R>,
  ): Component<Deps, R>;
};

/**
 * Starts a component declaration with a human-readable name.
 *
 * @param name Name used in diagnostics and symbol descriptions.
 * @returns A builder for declaring dependencies, interfaces, and a factory.
 */
export function defComp(name: string): ComponentBuilder {
  const _symbol = Symbol(name);
  return mkCompBuilder(name, _symbol, [], []);
}

function mkCompBuilder(
  name: string,
  symbol: symbol,
  deps: Token[],
  tokens: Token[],
): ComponentBuilder<any, any> {
  return {
    provide: (...newDeps: Token[]) =>
      mkCompBuilder(name, symbol, [...deps, ...newDeps], tokens),
    as: (i: Token) => mkCompBuilder(name, symbol, deps, [...tokens, i]),
    build: (factory: (...args: any[]) => any) =>
      mkComp(name, symbol, tokens, deps, factory),
  } as ComponentBuilder<any, any>;
}

function mkComp<Deps extends readonly Token[], Ret>(
  name: string,
  symbol: symbol,
  tokens: readonly Token[],
  deps: Deps,
  factory: (...args: any[]) => Ret | Promise<Ret>,
): Component<Deps, Ret> {
  const component: Component<Deps, Ret> = {
    name,
    key: symbol,
    kind: 'singular' as const,
    get _type(): Ret {
      throw new ReferenceError('_type is not callable');
    },
    tokens: [] as readonly Token[],
    deps: deps,
    factory: factory,
  };

  (component as { tokens: readonly Token[] }).tokens = [component, ...tokens];

  return component;
}
