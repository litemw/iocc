import { ImplOf, Token, TypeOfTuple } from './token';

type IntfAssert<Ret, I extends Token> = Ret extends ImplOf<I> ? I : never;

export type Component<
  Deps extends readonly Token[] = readonly Token[],
  Ret = unknown,
> = Token<Ret, 'singular'> & {
  readonly interfaces: readonly Token[];
  readonly deps: Deps;
  readonly factory: (...args: any[]) => Ret | Promise<Ret>;
  as<I extends Token>(i: IntfAssert<Ret, I>): Component<Deps, Ret>;
};

export type ComponentBuilder<
  Deps extends readonly Token[] = [],
  AsType = unknown,
> = {
  provide<P extends readonly Token[]>(
    ...deps: P
  ): ComponentBuilder<[...Deps, ...P], AsType>;
  as<I extends Token>(i: I): ComponentBuilder<Deps, AsType & ImplOf<I>>;
  <R extends AsType>(
    factory: (...args: TypeOfTuple<Deps>) => R | Promise<R>,
  ): Component<Deps, R>;
};

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
