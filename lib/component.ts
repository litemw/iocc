import { Interface, TypeOfTuple } from './interface';

// For multi interfaces the factory contributes a single element, not the full array.
type AsConstraint<I extends Interface> =
  I extends Interface<infer Arr, 'multi'>
    ? Arr extends (infer E)[]
      ? E
      : never
    : I['_type'];

export type Component<
  Deps extends readonly Interface[] = readonly Interface[],
  Ret = unknown,
> = {
  readonly name: string;
  readonly _symbol: symbol;
  readonly _interfaces: readonly Interface[];
  readonly _deps: Deps;
  readonly _factory: (...args: any[]) => Ret | Promise<Ret>;
};

export type ComponentBuilder<
  Deps extends readonly Interface[] = [],
  AsType = unknown,
> = {
  provide<P extends readonly Interface[]>(
    ...deps: P
  ): ComponentBuilder<[...Deps, ...P], AsType>;
  as<I extends Interface>(
    i: I,
  ): ComponentBuilder<Deps, AsType & AsConstraint<I>>;
  <R extends AsType>(
    factory: (...args: TypeOfTuple<Deps>) => R | Promise<R>,
  ): Component<Deps, R>;
};

export function defineComponent(name: string): ComponentBuilder {
  const _symbol = Symbol(name);
  return _makeBuilder(name, _symbol, [], []);
}

function _makeBuilder(
  name: string,
  symbol: symbol,
  deps: Interface[],
  interfaces: Interface[],
): ComponentBuilder<any, any> {
  const builder = function (
    factory: (...args: any[]) => any,
  ): Component<any, any> {
    return {
      name,
      _symbol: symbol,
      _interfaces: interfaces,
      _deps: deps as any,
      _factory: factory,
    };
  } as ComponentBuilder<any, any>;

  (builder as any).provide = (...newDeps: Interface[]) =>
    _makeBuilder(name, symbol, [...deps, ...newDeps], interfaces);

  (builder as any).as = (i: Interface) =>
    _makeBuilder(name, symbol, deps, [...interfaces, i]);

  return builder;
}
