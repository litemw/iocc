import { ImplOf, IToken, TypeOfTuple } from './interface';

type IntfAssert<Ret, I extends IToken> = Ret extends ImplOf<I> ? I : never;

export type Component<
  Deps extends readonly IToken[] = readonly IToken[],
  Ret = unknown,
> = {
  readonly name: string;
  readonly key: symbol;
  readonly interfaces: readonly IToken[];
  readonly deps: Deps;
  readonly factory: (...args: any[]) => Ret | Promise<Ret>;
  as<I extends IToken>(i: IntfAssert<Ret, I>): Component<Deps, Ret>;
};

export type ComponentBuilder<
  Deps extends readonly IToken[] = [],
  AsType = unknown,
> = {
  provide<P extends readonly IToken[]>(
    ...deps: P
  ): ComponentBuilder<[...Deps, ...P], AsType>;
  as<I extends IToken>(i: I): ComponentBuilder<Deps, AsType & ImplOf<I>>;
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
  deps: IToken[],
  interfaces: IToken[],
): ComponentBuilder<any, any> {
  const builder = function (
    factory: (...args: any[]) => any,
  ): Component<any, any> {
    return mkComp(name, symbol, interfaces, deps, factory);
  } as ComponentBuilder<any, any>;

  (builder as any).provide = (...newDeps: IToken[]) =>
    mkCompBuilder(name, symbol, [...deps, ...newDeps], interfaces);

  (builder as any).as = (i: IToken) =>
    mkCompBuilder(name, symbol, deps, [...interfaces, i]);

  return builder;
}

function mkComp<Deps extends readonly IToken[], Ret>(
  name: string,
  symbol: symbol,
  interfaces: readonly IToken[],
  deps: Deps,
  factory: (...args: any[]) => Ret | Promise<Ret>,
): Component<Deps, Ret> {
  return {
    name,
    key: symbol,
    interfaces: interfaces,
    deps: deps,
    factory: factory,
    as: (i) => mkComp(name, symbol, [...interfaces, i], deps, factory),
  };
}
