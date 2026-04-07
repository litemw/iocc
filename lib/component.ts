import { Interface, TypeOfTuple } from './interface';

// For multi interfaces the factory contributes a single element, not the full array.
type AsConstraint<I extends Interface> =
  I extends Interface<infer Arr, 'multi'>
    ? Arr extends (infer E)[]
      ? E
      : never
    : I['_type'];

export type Scope = 'singleton' | 'transient';

export type Component<
  Deps extends readonly Interface[] = readonly Interface[],
  Ret = unknown,
> = {
  readonly name: string;
  readonly _symbol: symbol;
  readonly _interfaces: readonly Interface[];
  readonly _deps: Deps;
  readonly _factory: (...args: any[]) => Ret | Promise<Ret>;
  readonly _scope: Scope;
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
  singleton(): ComponentBuilder<Deps, AsType>;
  transient(): ComponentBuilder<Deps, AsType>;
  <R extends AsType>(
    factory: (...args: TypeOfTuple<Deps>) => R | Promise<R>,
  ): Component<Deps, R>;
};

export function defineComponent(name: string): ComponentBuilder {
  const _symbol = Symbol(name);
  return _makeBuilder(name, _symbol, [], [], 'singleton');
}

function _makeBuilder(
  name: string,
  symbol: symbol,
  deps: Interface[],
  interfaces: Interface[],
  scope: Scope,
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
      _scope: scope,
    };
  } as ComponentBuilder<any, any>;

  (builder as any).provide = (...newDeps: Interface[]) =>
    _makeBuilder(name, symbol, [...deps, ...newDeps], interfaces, scope);

  (builder as any).as = (i: Interface) =>
    _makeBuilder(name, symbol, deps, [...interfaces, i], scope);

  (builder as any).singleton = () =>
    _makeBuilder(name, symbol, deps, interfaces, 'singleton');

  (builder as any).transient = () =>
    _makeBuilder(name, symbol, deps, interfaces, 'transient');

  return builder;
}
