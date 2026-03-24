export type Interface<I = any> = {
  name: string;
  _symbol: symbol;
  get _type(): I;
};

export type TypeOf<A extends Interface | Interface[]> = A extends [
  infer T extends Interface,
  ...infer R extends Interface[],
]
  ? R extends []
    ? T['_type']
    : T['_type'] & TypeOf<R>
  : A extends Interface
  ? A['_type']
  : never;

let interfaceIndex = 1;

export function defineInterface<I>(name?: string): Interface<I> {
  name = name ?? `interface-${interfaceIndex}`;
  interfaceIndex++;
  return {
    name: name,
    _symbol: Symbol(name),
    get _type(): I {
      throw ReferenceError('type is not callable');
    },
  };
}
