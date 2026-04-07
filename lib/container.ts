import { Interface } from './interface';
import { Component, Scope } from './component';
import { IContext, ResolutionContext } from './context';

type Entry = {
  readonly name: string;
  readonly deps: readonly Interface[];
  readonly factory: (...args: any[]) => any;
  readonly scope: Scope;
  readonly component: Component | undefined;
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
      scope: component._scope,
      component,
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
      const entry: Entry = {
        name: iface.name,
        deps: [],
        factory: () => value,
        scope: 'singleton',
        component: undefined,
      };
      const list = this._multi.get(iface._symbol) ?? [];
      list.push(entry);
      this._multi.set(iface._symbol, list);
    } else {
      if (this._singular.has(iface._symbol)) {
        throw new Error(`Interface "${iface.name}" is already registered`);
      }
      const entry: Entry = {
        name: iface.name,
        deps: [],
        factory: () => value,
        scope: 'singleton',
        component: undefined,
      };
      this._singular.set(iface._symbol, entry);
      this._cache.set(entry, Promise.resolve(value));
    }

    return this;
  }

  get<I extends Interface>(iface: I): Promise<I['_type']> {
    return this._resolve(iface, new Map(), undefined);
  }

  private _resolve(
    iface: Interface,
    chain: Map<Entry, Component>,
    requester: Component | undefined,
  ): Promise<any> {
    if (iface._symbol === IContext._symbol) {
      const ctx: ResolutionContext = {
        requester,
        chain: [...chain.values()],
      };
      return Promise.resolve(ctx);
    }

    const { _symbol: sym, _kind: kind } = iface;

    if (kind === 'multi') {
      const entries = this._multi.get(sym) ?? [];
      return Promise.all(
        entries.map((e) => this._resolveEntry(e, chain, requester)),
      );
    }

    const entry = this._singular.get(sym);

    if (!entry) {
      if (kind === 'optional') return Promise.resolve(undefined);
      throw new Error(`Interface "${iface.name}" is not registered`);
    }

    return this._resolveEntry(entry, chain, requester);
  }

  private _resolveEntry(
    entry: Entry,
    chain: Map<Entry, Component>,
    requester: Component | undefined,
  ): Promise<any> {
    if (entry.scope === 'singleton') {
      const cached = this._cache.get(entry);
      if (cached !== undefined) return cached;
    }

    if (chain.has(entry)) {
      const path = [...chain.keys(), entry].map((e) => e.name).join(' → ');
      throw new Error(`Circular dependency detected: ${path}`);
    }

    // nextChain includes the current entry — used for circular detection and
    // as the ancestor chain for deeper deps (excluding IContext).
    const nextChain: Map<Entry, Component> = entry.component
      ? new Map([...chain, [entry, entry.component]])
      : new Map(chain);

    const promise = Promise.all(
      [...entry.deps].map((dep) => {
        // IContext receives the chain *without* the current entry (ancestors only)
        // and the requester of the current entry — not the entry itself.
        if (dep._symbol === IContext._symbol) {
          return this._resolve(dep, chain, requester);
        }
        return this._resolve(dep, nextChain, entry.component);
      }),
    ).then((args) => entry.factory(...args));

    if (entry.scope === 'singleton') {
      this._cache.set(entry, promise);
    }

    return promise;
  }
}
