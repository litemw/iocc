import { Interface, TypeOf } from './interface';
import { Scope } from './container';

export type Component<A extends Interface[] = [], R = any> = {
  name: string;
  _symbol: symbol;
  get _type(): R;

  scope?: Scope;

  in(scope: Scope): Component<A, R>;

  provide<Providers extends Interface[]>(
    ...arr: Providers
  ): Component<[...A, ...Providers], R>;

  as<Ret extends R>(i: Interface): Component<A, R & Ret>;

  <Ret extends R>(cb: (...args: A) => Ret): Component<A, Ret>;
};

export type ComponentBuilder<A extends Interface[] = [], R = any> = Component<
  A,
  R
> & {
  <Ret extends R>(cb: (...args: A) => Ret): Component<A, Ret>;
};

let componentIndex = 1;

export function defineComponent(name?: string): Component {
  const _name = name ?? `component-${componentIndex}`;
  componentIndex++;

  const comp = function () {
    /**/
  } as unknown as Component;

  comp.name = _name;
  comp._symbol = Symbol(name);

  return comp;
}
