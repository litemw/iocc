import { ImplOf, Token, TypeOfTuple } from './token';

type IntfAssert<Ret, I extends Token> = Ret extends ImplOf<I> ? I : never;

/** Component descriptor that can provide its own token and declared interfaces. */
export type Component<
  Deps extends readonly Token[] = readonly Token[],
  Ret = unknown,
> = Token<Ret, 'singular'> & {
  /** Tokens this component is registered under, including its own token. */
  readonly interfaces: readonly Token[];

  /** Dependency tokens passed to the factory in declaration order. */
  readonly deps: Deps;

  /** Creates the component value from resolved dependency values. */
  readonly factory: (...args: any[]) => Ret | Promise<Ret>;

  /**
   * Adds an interface to an already created component.
   *
   * @param i Interface token compatible with the component return type.
   * @returns A new component descriptor registered under the extra interface.
   */
  as<I extends Token>(i: IntfAssert<Ret, I>): Component<Deps, Ret>;
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
  <R extends AsType>(
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
  interfaces: Token[],
): ComponentBuilder<any, any> {
  const builder = function (
    factory: (...args: any[]) => any,
  ): Component<any, any> {
    return mkComp(name, symbol, interfaces, deps, factory);
  } as ComponentBuilder<any, any>;

  (builder as any).provide = (...newDeps: Token[]) =>
    mkCompBuilder(name, symbol, [...deps, ...newDeps], interfaces);

  (builder as any).as = (i: Token) =>
    mkCompBuilder(name, symbol, deps, [...interfaces, i]);

  return builder;
}

function mkComp<Deps extends readonly Token[], Ret>(
  name: string,
  symbol: symbol,
  interfaces: readonly Token[],
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
    interfaces: [] as readonly Token[],
    deps: deps,
    factory: factory,
    as: (i) => mkComp(name, symbol, [...interfaces, i], deps, factory),
  };

  (component as { interfaces: readonly Token[] }).interfaces = [
    component,
    ...interfaces,
  ];

  return component;
}
