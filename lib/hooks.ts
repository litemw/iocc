import { Component } from './component';
import { ContainerError } from './errors';
import { Token } from './token';

/** Optional observability callbacks a `Container` invokes as it registers and resolves components. */
export type ContainerHooks = {
  /**
   * Called when a component is registered under its own and extra tokens.
   *
   * @param component Component descriptor that was registered.
   * @param tokens Tokens the component was registered under, including its own.
   */
  onRegister?(component: Component, tokens: readonly Token[]): void;

  /**
   * Called when a `get()` call starts resolving a token, before any cache lookup.
   *
   * @param token Token passed to `get()`.
   */
  onResolveStart?(token: Token): void;

  /**
   * Called when a `get()` call finishes, whether the value came from cache or was freshly built.
   *
   * @param token Token passed to `get()`.
   * @param value Resolved value.
   * @param durationMs Time spent resolving, in milliseconds.
   */
  onResolveEnd?(token: Token, value: unknown, durationMs: number): void;

  /**
   * Called immediately before a component's factory is invoked, i.e. on a cache miss.
   *
   * @param component Component whose factory is about to run.
   */
  onFactoryStart?(component: Component): void;

  /**
   * Called after a component's factory has produced a value.
   *
   * @param component Component whose factory ran.
   * @param value Value returned by the factory.
   * @param durationMs Time spent inside the factory, in milliseconds.
   */
  onFactoryEnd?(component: Component, value: unknown, durationMs: number): void;

  /**
   * Called when a component's cached value is reused instead of invoking its factory.
   *
   * @param component Component whose cached value was reused.
   */
  onCacheHit?(component: Component): void;

  /**
   * Called when resolving a `.multi` token, after all contributing entries have resolved.
   *
   * @param token Multi token that was resolved.
   * @param count Number of contributing entries collected.
   */
  onMultiResolve?(token: Token, count: number): void;

  /**
   * Called when the container throws a `ContainerError`, before it propagates to the caller.
   *
   * @param error The error about to be thrown.
   * @param context Token related to the failure, when applicable.
   */
  onError?(error: ContainerError, context: { token?: Token }): void;
};
