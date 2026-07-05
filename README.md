# @litemw/iocc

Type-safe IoC container for the LiteMW ecosystem, inspired by [dig](https://github.com/uber-go/dig).

- **Zero dependencies**
- **Type-safe** — `get(IFoo)` returns `Foo`, no casts
- **Async-first** — factories can be `async`, `get()` always returns `Promise<T>`
- **Singleton by default** — factories are called once and values are cached

## Install

```sh
npm install @litemw/iocc
# or
bun add @litemw/iocc
```

## Core concepts

| Concept | Description |
|---|---|
| `Token<T>` | Typed injection key — identifies a dependency by symbol, carries type info |
| `Interface<T>` | Named token with `.optional` and `.multi` variants |
| `Component` | A provider and a singular token for its own factory result |
| `Container` | Registry that wires components together and resolves the graph |

## Quick start

```ts
import { Container, defComp, defIntf } from '@litemw/iocc';

// 1. Define typed injection keys
const IConfig = defIntf<{ dbUrl: string }>('Config');
const IDatabase = defIntf<Database>('Database');
const IUserService = defIntf<UserService>('UserService');

// 2. Define components
const configComponent = defComp('config')
  .as(IConfig)
  (() => ({ dbUrl: 'postgres://localhost/mydb' }));

const databaseComponent = defComp('database')
  .provide(IConfig)           // declare dependencies — order = factory arg order
  .as(IDatabase)
  (async (config) => {        // factory can be async
    const db = new Database(config.dbUrl);
    await db.connect();
    return db;
  });

const userServiceComponent = defComp('userService')
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
  ((dep1, dep2, dep3) => new Impl(dep1, dep2, dep3))
```

- `.provide(...interfaces)` — declares dependencies; factory args match the declared order
- `.as(interface)` — declares implemented interfaces; TypeScript enforces the return type
- The factory can return `T` or `Promise<T>`

Every component is also registered as its own token:

```ts
const config = defComp('config')(() => ({ dbUrl: 'postgres://localhost/mydb' }));

const database = defComp('database')
  .provide(config)
  ((cfg) => new Database(cfg.dbUrl));

container.register(config).register(database);

await container.get(config); // { dbUrl: string }
```

You can also add an interface after a component is created:

```ts
const component = defComp('logger')(() => new ConsoleLogger());

container.register(component.as(ILogger));
```

This returns a new component descriptor with the extra interface attached.

### `Container`

```ts
const container = new Container();

// Register a component
container.register(component);  // throws if the interface is already registered

// Resolve
const value = await container.get(IFoo);           // Promise<Foo>
const value = await container.get(IFoo.optional);  // Promise<Foo | undefined>
const values = await container.get(IFoo.multi);    // Promise<Foo[]>
```

`register()` returns `this`, so calls can be chained.

## Optional dependencies

```ts
const ILogger = defIntf<Logger>('Logger');

const serviceComponent = defComp('service')
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
const IPlugin = defIntf<Plugin>('Plugin');

// Each component contributes one element to the group
const pluginA = defComp('pluginA').as(IPlugin.multi)(() => new PluginA());
const pluginB = defComp('pluginB').as(IPlugin.multi)(() => new PluginB());

const appComponent = defComp('app')
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

Even though `get(IPlugin.multi)` resolves to `Plugin[]`, a component registered
with `.as(IPlugin.multi)` still returns a single `Plugin`.

## Factories as dependencies

Components are cached after the first resolution. If you need a fresh value on demand,
provide a factory function and call it from the consumer:

```ts
const ICreateRequest = defIntf<() => Request>('CreateRequest');

const createRequestComponent = defComp('createRequest')
  .as(ICreateRequest)
  (() => () => new Request());

const createRequest = await container.get(ICreateRequest);
const request = createRequest();
```

## Values

Provide a value with a component factory — useful for configuration objects and test doubles:

```ts
const configComponent = defComp('config')
  .as(IConfig)
  (() => ({ dbUrl: process.env.DATABASE_URL }));

const container = new Container()
  .register(configComponent)
  .register(databaseComponent)
  .register(userServiceComponent);
```

## Error handling

| Situation | Error |
|---|---|
| `get()` for an unregistered interface | `Interface "Foo" is not registered` |
| `register()` duplicate | `Interface "Foo" is already registered` |
| Circular dependency | `Circular dependency detected: A → B → A` |

## License

MIT
