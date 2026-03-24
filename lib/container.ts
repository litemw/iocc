import { AsyncLocalStorage } from 'async_hooks';
import { Component } from './component';
import { Interface, TypeOf } from './interface';

export enum Scope {
  Singleton,
  Transient,
  Scoped,
}

export class Container {
  register<C extends Component>(component: C) {
    //
  }

  get<I extends Interface>(intf: I): I['_type'] {
    //
    throw 'unimplemented';
  }
}
