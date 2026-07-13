import { ImplOf, Token, TypeOf } from './token';
import { Component } from './component';
import {
  CircularDependencyError,
  ContainerError,
  InterfaceAlreadyRegisteredError,
  InterfaceNotRegisteredError,
} from './errors';
import { ContainerHooks } from './hooks';

type Entry = {
  readonly name: string;
  readonly deps: readonly Token[];
  readonly factory: (...args: any[]) => any;
  readonly component: Component;
};

type TokenAssert<Ret, I extends Token> = Ret extends ImplOf<I> ? I : never;

type TokenTupleAssert<Ret, Tokens extends readonly Token[]> = {
  [K in keyof Tokens]: Tokens[K] extends Token
    ? TokenAssert<Ret, Tokens[K]>
    : never;
};

/** Dependency injection container that registers components and resolves values. */
export class Container {
  private readonly _singular = new Map<symbol, Entry>();
  private readonly _multi = new Map<symbol, Entry[]>();
  private readonly _cache = new Map<Entry, Promise<any>>();

  /**
   * Creates a container.
   *
   * @param hooks Optional observability callbacks invoked on registration and resolution.
   */
  constructor(private readonly hooks: ContainerHooks = {}) {}

  /**
   * Registers a component under its own token, declared tokens, and extra tokens.
   *
   * @param component Component descriptor created by defComp.
   * @param tokens Additional compatible tokens to register the component under.
   * @returns This container, for chained registrations.
   */
  register(component: Component): this;
  register<Ret, const Tokens extends readonly Token[]>(
    component: Component<any, Ret>,
    ...tokens: Tokens & TokenTupleAssert<Ret, Tokens>
  ): this;
  register(component: Component, ...tokens: Token[]): this {
    const entry: Entry = {
      name: component.name,
      deps: component.deps,
      factory: component.factory,
      component,
    };

    const allTokens = [...component.tokens, ...tokens];

    for (const iface of allTokens) {
      if (iface.kind === 'multi') {
        const list = this._multi.get(iface.key) ?? [];
        list.push(entry);
        this._multi.set(iface.key, list);
      } else {
        if (this._singular.has(iface.key)) {
          throw this._fail(
            new InterfaceAlreadyRegisteredError(iface.name),
            iface,
          );
        }
        this._singular.set(iface.key, entry);
      }
    }

    this.hooks.onRegister?.(component, allTokens);

    return this;
  }

  /**
   * Resolves a token to its value, optional value, or multi-value array.
   *
   * @param token Token, optional token, multi token, or component token to resolve.
   * @returns Promise for the resolved value typed according to the token kind.
   */
  get<I extends Token>(token: I): Promise<TypeOf<I>> {
    const start = Date.now();
    this.hooks.onResolveStart?.(token);

    return this.resolve(token, new Map()).then((value) => {
      this.hooks.onResolveEnd?.(token, value, Date.now() - start);
      return value;
    });
  }

  private resolve(iface: Token, chain: Map<Entry, string>): Promise<any> {
    const { key: sym, kind: kind } = iface;

    if (kind === 'multi') {
      const entries = this._multi.get(sym) ?? [];
      return Promise.all(entries.map((e) => this.resolveEntry(e, chain))).then(
        (values) => {
          this.hooks.onMultiResolve?.(iface, values.length);
          return values;
        },
      );
    }

    const entry = this._singular.get(sym);

    if (!entry) {
      if (kind === 'optional') return Promise.resolve(undefined);
      throw this._fail(new InterfaceNotRegisteredError(iface.name), iface);
    }

    return this.resolveEntry(entry, chain);
  }

  private resolveEntry(entry: Entry, chain: Map<Entry, string>): Promise<any> {
    const cached = this._cache.get(entry);
    if (cached !== undefined) {
      this.hooks.onCacheHit?.(entry.component);
      return cached;
    }

    if (chain.has(entry)) {
      throw this._fail(
        new CircularDependencyError([...chain.values(), entry.name]),
        undefined,
      );
    }

    const nextChain = new Map([...chain, [entry, entry.name]]);

    const promise = Promise.all(
      entry.deps.map((dep) => this.resolve(dep, nextChain)),
    ).then((args) => {
      const start = Date.now();
      this.hooks.onFactoryStart?.(entry.component);

      return Promise.resolve(entry.factory(...args)).then((value) => {
        this.hooks.onFactoryEnd?.(entry.component, value, Date.now() - start);
        return value;
      });
    });

    this._cache.set(entry, promise);
    return promise;
  }

  private _fail<E extends ContainerError>(
    error: E,
    token: Token | undefined,
  ): E {
    this.hooks.onError?.(error, { token });
    return error;
  }
}
