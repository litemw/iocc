import { Component } from './component';
import { defineInterface, Interface } from './interface';

export type ResolutionContext = {
  readonly requester: Component | undefined;
  readonly chain: Component[];
};

export const IContext: Interface<ResolutionContext, 'singular'> =
  defineInterface<ResolutionContext>('Context');
