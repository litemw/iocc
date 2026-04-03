import { Interface } from './interface';
import { Component } from './component';

type Entry = {
  readonly name: string;
  readonly deps: readonly Interface[];
  readonly factory: (...args: any[]) => any;
};

export class Container {
  private readonly _singular = new Map<symbol, Entry>();
  private readonly _multi = new Map<symbol, Entry[]>();
  private readonly _cache = new Map<Entry, Promise<any>>();

  register(component: Component): this {
    const entry: Entry = {
      name: component.name,
      deps: component._deps,
      factory: component._factory,
    };

    for (const iface of component._interfaces) {
      if (iface._kind === 'multi') {
        const list = this._multi.get(iface._symbol) ?? [];
        list.push(entry);
        this._multi.set(iface._symbol, list);
      } else {
        if (this._singular.has(iface._symbol)) {
          throw new Error(`Interface "${iface.name}" is already registered`);
        }
        this._singular.set(iface._symbol, entry);
      }
    }

    return this;
  }

  supply<I extends Interface>(iface: I, value: Awaited<I['_type']>): this {
    if (iface._kind === 'multi') {
      const entry: Entry = { name: iface.name, deps: [], factory: () => value };
      const list = this._multi.get(iface._symbol) ?? [];
      list.push(entry);
      this._multi.set(iface._symbol, list);
    } else {
      if (this._singular.has(iface._symbol)) {
        throw new Error(`Interface "${iface.name}" is already registered`);
      }
      const entry: Entry = { name: iface.name, deps: [], factory: () => value };
      this._singular.set(iface._symbol, entry);
      this._cache.set(entry, Promise.resolve(value));
    }

    return this;
  }

  get<I extends Interface>(iface: I): Promise<I['_type']> {
    return this._resolve(iface, new Map());
  }

  private _resolve(iface: Interface, chain: Map<Entry, string>): Promise<any> {
    const { _symbol: sym, _kind: kind } = iface;

    if (kind === 'multi') {
      const entries = this._multi.get(sym) ?? [];
      return Promise.all(entries.map((e) => this._resolveEntry(e, chain)));
    }

    const entry = this._singular.get(sym);

    if (!entry) {
      if (kind === 'optional') return Promise.resolve(undefined);
      throw new Error(`Interface "${iface.name}" is not registered`);
    }

    return this._resolveEntry(entry, chain);
  }

  private _resolveEntry(entry: Entry, chain: Map<Entry, string>): Promise<any> {
    const cached = this._cache.get(entry);
    if (cached !== undefined) return cached;

    if (chain.has(entry)) {
      const path = [...chain.values(), entry.name].join(' → ');
      throw new Error(`Circular dependency detected: ${path}`);
    }

    const nextChain = new Map([...chain, [entry, entry.name]]);

    const promise = Promise.all(
      [...entry.deps].map((dep) => this._resolve(dep, nextChain)),
    ).then((args) => entry.factory(...args));

    this._cache.set(entry, promise);
    return promise;
  }
}
