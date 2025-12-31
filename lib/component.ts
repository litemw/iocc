import { Interface, TypeOf } from './interface';
import { Scope } from './container';

export type Component<T = any> = {
  name: string;
  _symbol: symbol;
  _constructor: () => T;
  _children: ComponentsMap;
  _imports: ComponentsMap;
  _exports: ComponentsMap;
  _scope?: Scope;
};

export class ComponentsMap {
  private map = new Map<symbol, Component[]>();
  private instanceMap = new Map<symbol, any>();

  public set<I, C extends TypeOf<Interface<I>>>(
    i: Interface<I> | Component<I>,
    c: Component<C>,
  ) {
    if (!this.map.has(i._symbol)) {
      this.map.set(i._symbol, [c]);
    } else {
      this.map.get(i._symbol)?.push(c);
    }
  }

  public get<I>(i: Interface<I>): Component<TypeOf<Interface<I>>> | null {
    return this.map.get(i._symbol)?.[0] ?? null;
  }

  public getMany<I>(i: Interface<I>): Component<TypeOf<Interface<I>>>[] {
    return this.map.get(i._symbol) ?? [];
  }

  public setInstance<T>(c: Component<T>, obj: T) {
    return this.instanceMap.set(c._symbol, obj);
  }

  public getInstance<T>(c: Component<T>) {
    return this.instanceMap.get(c._symbol);
  }
}

let componentIndex = 1;

export function defineComponent<T>(name: string, cb: () => T): Component<T>;
export function defineComponent<T>(cb: () => T): Component<T>;
export function defineComponent(
  cbOrName: (() => any) | string,
  cb?: () => any,
): Component {
  const name =
    typeof cbOrName === 'string' ? cbOrName : `component-${componentIndex}`;
  componentIndex++;

  return {
    name,
    _symbol: Symbol(name),
    _constructor() {
      return (cb ?? (cbOrName as CallableFunction))();
    },
    _imports: new ComponentsMap(),
    _exports: new ComponentsMap(),
    _children: new ComponentsMap(),
  };
}
