# @litemw/iocc

Type-safe IoC container for the LiteMW ecosystem, inspired by [dig](https://github.com/uber-go/dig).

- **Zero dependencies**
- **Type-safe** — `get(IFoo)` returns `Foo`, no casts
- **Async-first** — factories can be `async`, `get()` always returns `Promise<T>`
- **Singleton by default** — instances are created once and cached
- **Scoped** — per-component lifecycle: `singleton` or `transient`

## Install

```sh
npm install @litemw/iocc
# or
bun add @litemw/iocc
```

## Core concepts

| Concept | Description |
|---|---|
| `Interface<T>` | Typed injection key — identifies a dependency by symbol, carries type info |
| `Component` | A provider: declares its dependencies and a factory that creates the value |
| `Container` | Registry that wires components together and resolves the graph |

## Quick start

```ts
import { Container, defineComponent, defineInterface } from '@litemw/iocc';

// 1. Define typed injection keys
const IConfig = defineInterface<{ dbUrl: string }>('Config');
const IDatabase = defineInterface<Database>('Database');
const IUserService = defineInterface<UserService>('UserService');

// 2. Define components
const configComponent = defineComponent('config')
  .as(IConfig)
  (() => ({ dbUrl: 'postgres://localhost/mydb' }));

const databaseComponent = defineComponent('database')
  .provide(IConfig)           // declare dependencies — order = factory arg order
  .as(IDatabase)
  (async (config) => {        // factory can be async
    const db = new Database(config.dbUrl);
    await db.connect();
    return db;
  });

const userServiceComponent = defineComponent('userService')
  .provide(IConfig, IDatabase)
  .as(IUserService)
  ((config, db) => new UserService(config, db));

// 3. Register and resolve
const container = new Container()
  .register(configComponent)
  .register(databaseComponent)
  .register(userServiceComponent);

const userService = await container.get(IUserService);
// → UserService, fully typed
```

## API

### `defineInterface<T>(name)`

Creates a typed injection key. The name is used in error messages.

```ts
const ILogger = defineInterface<Logger>('Logger');
```

Every interface has two derived variants:

```ts
ILogger.optional  // Interface<Logger | undefined> — resolves to undefined if not registered
ILogger.multi     // Interface<Logger[]>           — collects all registered implementations
```

### `defineComponent(name)`

Returns a builder for declaring a component.

```ts
defineComponent('name')
  .provide(IDep1, IDep2.optional, IDep3.multi)  // dependencies
  .as(IResult)                                   // what it implements (can chain multiple)
  ((dep1, dep2, dep3) => new Impl(dep1, dep2, dep3))
```

- `.provide(...interfaces)` — declares dependencies; factory args match the declared order
- `.as(interface)` — declares implemented interfaces; TypeScript enforces the return type
- `.singleton()` / `.transient()` — sets the lifecycle scope (default: `singleton`)
- The factory can return `T` or `Promise<T>`

### `Container`

```ts
const container = new Container();

// Register a component
container.register(component);  // throws if the interface is already registered

// Provide a pre-built value (no factory)
container.supply(IConfig, { dbUrl: '...' });

// Resolve
const value = await container.get(IFoo);           // Promise<Foo>
const value = await container.get(IFoo.optional);  // Promise<Foo | undefined>
const values = await container.get(IFoo.multi);    // Promise<Foo[]>
```

`register()` and `supply()` return `this`, so calls can be chained.

## Optional dependencies

```ts
const ILogger = defineInterface<Logger>('Logger');

const serviceComponent = defineComponent('service')
  .provide(ILogger.optional)
  ((logger) => {
    // logger is Logger | undefined
    logger?.info('service created');
    return new Service();
  });
```

If `ILogger` is not registered, `logger` will be `undefined`. No error is thrown.

## Value groups (multi)

Register multiple implementations under the same interface:

```ts
const IPlugin = defineInterface<Plugin>('Plugin');

// Each component contributes one element to the group
const pluginA = defineComponent('pluginA').as(IPlugin.multi)(() => new PluginA());
const pluginB = defineComponent('pluginB').as(IPlugin.multi)(() => new PluginB());

const appComponent = defineComponent('app')
  .provide(IPlugin.multi)
  ((plugins) => {
    // plugins: Plugin[]
    return new App(plugins);
  });

const container = new Container()
  .register(pluginA)
  .register(pluginB)
  .register(appComponent);
```

If no implementations are registered, `get(IPlugin.multi)` returns `[]`.

## Scopes

Every component has a lifecycle scope that controls when the factory is called.

| Scope | Behaviour |
|---|---|
| `singleton` | Factory is called once; the result is cached and reused on every `get()` call. **Default.** |
| `transient` | Factory is called on every `get()` call; no caching. |

```ts
// singleton (default) — one shared instance
const dbComponent = defineComponent('db')
  .as(IDatabase)
  (async () => {
    const db = new Database();
    await db.connect();
    return db;
  });

// transient — new instance on every get()
const requestComponent = defineComponent('request')
  .as(IRequest)
  .transient()
  (() => new Request());
```

`.singleton()` and `.transient()` can be placed anywhere in the builder chain before the factory call.

> **Note:** `supply()` always behaves as `singleton`.

## Supply

Provide a pre-built value without a factory — useful for configuration objects and test doubles:

```ts
const container = new Container()
  .supply(IConfig, { dbUrl: process.env.DATABASE_URL })
  .register(databaseComponent)
  .register(userServiceComponent);
```

## Error handling

| Situation | Error |
|---|---|
| `get()` for an unregistered interface | `Interface "Foo" is not registered` |
| `register()` or `supply()` duplicate | `Interface "Foo" is already registered` |
| Circular dependency | `Circular dependency detected: A → B → A` |

## License

MIT
