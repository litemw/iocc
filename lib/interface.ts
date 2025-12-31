export type Interface<I = any> = {
  _name: string;
  _symbol: symbol;
  get type(): I;
};

export type TypeOf<A extends Interface | Interface[]> = A extends [
  infer T extends Interface,
  ...infer R extends Interface[],
]
  ? R extends []
    ? T['type']
    : T['type'] & TypeOf<R>
  : A extends Interface
  ? A['type']
  : never;

let interfaceIndex = 1;

export function defineInterface<I>(name?: string): Interface<I> {
  name = name ?? `interface-${interfaceIndex}`;
  interfaceIndex++;
  return {
    _name: name,
    _symbol: Symbol(name),
    get type(): I {
      throw ReferenceError('type is not callable');
    },
  };
}
