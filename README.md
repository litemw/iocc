# @litemw/iocc

[![CI](https://github.com/litemw/iocc/actions/workflows/ci.yml/badge.svg)](https://github.com/litemw/iocc/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@litemw/iocc.svg)](https://www.npmjs.com/package/@litemw/iocc)
[![coverage](https://codecov.io/github/litemw/iocc/graph/badge.svg)](https://app.codecov.io/github/litemw/iocc)
[![license](https://img.shields.io/npm/l/@litemw/iocc.svg)](./LICENSE)

A lightweight, type-safe IoC container, inspired by [dig](https://github.com/uber-go/dig).

🪶 **Zero dependencies** — no runtime deps, tiny footprint

🛡️ **Type-safe** — `get(IFoo)` returns `Foo`, no casts

⚡ **Fast** — plain `Map` lookups and a flat resolution graph, no reflection or decorators

⏳ **Async-first** — factories can be `async`, `get()` always returns `Promise<T>`

♻️ **Singleton by default** — factories are called once and values are cached

## 📦 Install

```sh
npm install @litemw/iocc
# or
pnpm add @litemw/iocc
# or
yarn add @litemw/iocc
# or
bun add @litemw/iocc
# or
deno add npm:@litemw/iocc
```

## 🧩 Core concepts

| Concept | Description |
|---|---|
| `Token<T>` | Typed injection key — identifies a dependency by symbol, carries type info |
| `Interface<T>` | Named token with `.optional` and `.multi` variants |
| `Component` | A provider and a singular token for its own factory result |
| `Container` | Registry that wires components together and resolves the graph |

## 🚀 Quick start

```ts
import { Container, defComp, defIntf } from '@litemw/iocc';

// 1. Define typed injection keys
const IConfig = defIntf<{ dbUrl: string }>('Config');
const IDatabase = defIntf<Database>('Database');
const IUserService = defIntf<UserService>('UserService');

// 2. Define components
const ConfigComponent = defComp('config')
  .as(IConfig)
  .build(() => ({ dbUrl: 'postgres://localhost/mydb' }));

const DatabaseComponent = defComp('database')
  .provide(IConfig)           // declare dependencies — order = factory arg order
  .as(IDatabase)
  .build(async (config) => {  // factory can be async
    const db = new Database(config.dbUrl);
    await db.connect();
    return db;
  });

const UserServiceComponent = defComp('userService')
  .provide(IConfig, IDatabase)
  .as(IUserService)
  .build((config, db) => new UserService(config, db));

// 3. Register and resolve
const container = new Container()
  .register(ConfigComponent)
  .register(DatabaseComponent)
  .register(UserServiceComponent);

const userService = await container.get(IUserService);
// → UserService, fully typed
```

## 🧪 Examples

Runnable examples live in [`examples/`](./examples):

```sh
cd examples
bun run all
```

## 📖 API

### `defIntf<T>(name)`

Creates a typed injection key. The name is used in error messages.

```ts
const ILogger = defIntf<Logger>('Logger');
```

Every interface has two derived variants:

```ts
ILogger.optional  // optional Logger — resolves to undefined if not registered
ILogger.multi     // multi Logger    — collects all registered implementations
```

The derived variants keep the same implementation type (`Logger`). The container
uses the variant kind when resolving:

```ts
await container.get(ILogger);          // Logger
await container.get(ILogger.optional); // Logger | undefined
await container.get(ILogger.multi);    // Logger[]
```

### `defComp(name)`

Returns a builder for declaring a component.

```ts
defComp('name')
  .provide(IDep1, IDep2.optional, IDep3.multi)  // dependencies
  .as(IResult)                                   // what it implements (can chain multiple)
  .build((dep1, dep2, dep3) => new Impl(dep1, dep2, dep3))
```

- `.provide(...interfaces)` — declares dependencies; factory args match the declared order
- `.as(interface)` — declares implemented interfaces; TypeScript enforces the return type
- `.build(factory)` — finalizes the component declaration
- The factory can return `T` or `Promise<T>`

Every component is also registered as its own token:

```ts
const ConfigComponent = defComp('config').build(() => ({
  dbUrl: 'postgres://localhost/mydb',
}));

const DatabaseComponent = defComp('database')
  .provide(ConfigComponent)
  .build((cfg) => new Database(cfg.dbUrl));

container.register(ConfigComponent).register(DatabaseComponent);

await container.get(ConfigComponent); // { dbUrl: string }
```

You can also bind a component to one or more interfaces when registering it:

```ts
const Logger = defComp('logger').build(() => new ConsoleLogger());

container.register(Logger, ILogger);
```

The registration-time form is also type-checked: the component factory result
must satisfy every interface passed to `register()`.

### `Container`

```ts
const container = new Container();

// Register a component
container.register(Component);           // by its own token and declared interfaces
container.register(Component, IFoo);     // by an extra compatible interface
container.register(Component, IBar, IBaz); // by multiple extra interfaces

// Resolve
const value = await container.get(IFoo);           // Promise<Foo>
const value = await container.get(IFoo.optional);  // Promise<Foo | undefined>
const values = await container.get(IFoo.multi);    // Promise<Foo[]>
```

`register()` returns `this`, so calls can be chained.

## ❓ Optional dependencies

```ts
const ILogger = defIntf<Logger>('Logger');

const ServiceComponent = defComp('service')
  .provide(ILogger.optional)
  .build((logger) => {
    // logger is Logger | undefined
    logger?.info('service created');
    return new Service();
  });
```

If `ILogger` is not registered, `logger` will be `undefined`. No error is thrown.

## 🧬 Value groups (multi)

Register multiple implementations under the same interface:

```ts
const IPlugin = defIntf<Plugin>('Plugin');

// Each component contributes one element to the group
const PluginAComponent = defComp('pluginA').build(() => new PluginA());
const PluginBComponent = defComp('pluginB').build(() => new PluginB());

const AppComponent = defComp('app')
  .provide(IPlugin.multi)
  .build((plugins) => {
    // plugins: Plugin[]
    return new App(plugins);
  });

const container = new Container()
  .register(PluginAComponent, IPlugin.multi)
  .register(PluginBComponent, IPlugin.multi)
  .register(AppComponent);
```

If no implementations are registered, `get(IPlugin.multi)` returns `[]`.

Even though `get(IPlugin.multi)` resolves to `Plugin[]`, each component
registered under `IPlugin.multi` still returns a single `Plugin`.

## 🏭 Factories as dependencies

Components are cached after the first resolution. If you need a fresh value on demand,
provide a factory function and call it from the consumer:

```ts
const ICreateRequest = defIntf<() => Request>('CreateRequest');

const CreateRequestComponent = defComp('createRequest')
  .as(ICreateRequest)
  .build(() => () => new Request());

const createRequest = await container.get(ICreateRequest);
const request = createRequest();
```

## 🧱 Values

Provide a value with a component factory — useful for configuration objects and test doubles:

```ts
const ConfigComponent = defComp('config')
  .as(IConfig)
  .build(() => ({ dbUrl: process.env.DATABASE_URL }));

const container = new Container()
  .register(ConfigComponent)
  .register(DatabaseComponent)
  .register(UserServiceComponent);
```

## ⚠️ Error handling

| Situation | Error |
|---|---|
| `get()` for an unregistered interface | `Interface "Foo" is not registered` |
| `register()` duplicate | `Interface "Foo" is already registered` |
| Circular dependency | `Circular dependency detected: A → B → A` |

## 📄 License

MIT
