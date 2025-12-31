import { AsyncLocalStorage } from 'async_hooks';
import { Component, ComponentsMap } from './component';
import { Interface, TypeOf } from './interface';

export enum Scope {
  Singleton,
  Transient,
  Scoped,
}

export type ALSContext = {
  stack: Component[];
  current: Component;
};

type Provider = {
  export: () => void;
  _component: Component;
};

type ProvideFnSingle = {
  <
    const TI extends Interface[],
    const CI extends TypeOf<TI> | Promise<TypeOf<TI>>,
    C extends Component<CI>,
  >(
    component: C,
    ...interfaces: TI
  ): Provider;
};

type ProvideFn = ProvideFnSingle & {
  singleton: ProvideFnSingle;
  transient: ProvideFnSingle;
  scoped: ProvideFnSingle;
};

function appendToMap(
  map: ComponentsMap,
  component: Component,
  ...interfaces: Interface[]
) {
  if (interfaces.length === 0) {
    map.set(component, component);
  } else {
    interfaces.forEach((i) => map.set(i, component));
  }
}

function _provide(scope: Scope) {
  return function <
    const TI extends Interface[],
    const CI extends TypeOf<TI> | Promise<TypeOf<TI>>,
    C extends Component<CI>,
  >(component: C, ...interfaces: TI): Provider {
    const ctx = als.getStore();
    if (!ctx) {
      throw new Error('cannot provide withoud async context');
    }

    component._scope = scope;
    appendToMap(ctx?.current._children, component, ...interfaces);

    return {
      export: () => {
        appendToMap(ctx?.current._exports, component, ...interfaces);
      },
      _component: component,
    };
  };
}

export const provide: ProvideFn = Object.assign(_provide(Scope.Singleton), {
  singleton: _provide(Scope.Singleton),
  transient: _provide(Scope.Transient),
  scoped: _provide(Scope.Scoped),
});

type InjectOneFn = <const I>(intf: Interface<I>) => Promise<I>;

type InjectFn = InjectOneFn & {
  many: InjectOneFn;
  import: InjectOneFn;
};

export function _inject<const I>(intf: Interface<I>): Promise<I> {
  const ctx = als.getStore();
  let comp = ctx?.current._children.get(intf);
  if (!comp) {
    comp = ctx?.current._imports.get(intf);
  }
  if (!comp) {
    throw new Error('cannot find component');
  }

  switch (comp._scope) {
    case Scope.Transient:
      break;
    case Scope.Scoped:
      break;
    case Scope.Singleton:
      break;
  }
}

export const als = new AsyncLocalStorage<ALSContext>();

export function createComponent<T>(c: Component<T>): T {
  const ctx = als.getStore() ?? { global: new Map(), scoped: new Map() };
  return als.run(ctx, () => c._constructor());
}
