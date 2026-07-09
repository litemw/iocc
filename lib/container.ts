import { Token, TypeOf } from './token';
import { Component } from './component';
import {
  CircularDependencyError,
  InterfaceAlreadyRegisteredError,
  InterfaceNotRegisteredError,
} from './errors';

type Entry = {
  readonly name: string;
  readonly deps: readonly Token[];
  readonly factory: (...args: any[]) => any;
};

/** Dependency injection container that registers components and resolves values. */
export class Container {
  private readonly _singular = new Map<symbol, Entry>();
  private readonly _multi = new Map<symbol, Entry[]>();
  private readonly _cache = new Map<Entry, Promise<any>>();

  /**
   * Registers a component under its own token and declared interfaces.
   *
   * @param component Component descriptor created by defComp.
   * @returns This container, for chained registrations.
   */
  register(component: Component): this {
    const entry: Entry = {
      name: component.name,
      deps: component.deps,
      factory: component.factory,
    };

    for (const iface of component.interfaces) {
      if (iface.kind === 'multi') {
        const list = this._multi.get(iface.key) ?? [];
        list.push(entry);
        this._multi.set(iface.key, list);
      } else {
        if (this._singular.has(iface.key)) {
          throw new InterfaceAlreadyRegisteredError(iface.name);
        }
        this._singular.set(iface.key, entry);
      }
    }

    return this;
  }

  /**
   * Resolves a token to its value, optional value, or multi-value array.
   *
   * @param iface Token, optional token, multi token, or component token to resolve.
   * @returns Promise for the resolved value typed according to the token kind.
   */
  get<I extends Token>(iface: I): Promise<TypeOf<I>> {
    return this._resolve(iface, new Map());
  }

  private _resolve(iface: Token, chain: Map<Entry, string>): Promise<any> {
    const { key: sym, kind: kind } = iface;

    if (kind === 'multi') {
      const entries = this._multi.get(sym) ?? [];
      return Promise.all(entries.map((e) => this._resolveEntry(e, chain)));
    }

    const entry = this._singular.get(sym);

    if (!entry) {
      if (kind === 'optional') return Promise.resolve(undefined);
      throw new InterfaceNotRegisteredError(iface.name);
    }

    return this._resolveEntry(entry, chain);
  }

  private _resolveEntry(entry: Entry, chain: Map<Entry, string>): Promise<any> {
    const cached = this._cache.get(entry);
    if (cached !== undefined) return cached;

    if (chain.has(entry)) {
      throw new CircularDependencyError([...chain.values(), entry.name]);
    }

    const nextChain = new Map([...chain, [entry, entry.name]]);

    const promise = Promise.all(
      entry.deps.map((dep) => this._resolve(dep, nextChain)),
    ).then((args) => entry.factory(...args));

    this._cache.set(entry, promise);
    return promise;
  }
}
