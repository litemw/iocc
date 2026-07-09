import { Container, defComp, defIntf } from '../lib';

type Logger = {
  info(message: string): void;
};

type Plugin = {
  readonly name: string;
  run(): string;
};

type App = {
  boot(): string[];
};

const ILogger = defIntf<Logger>('Logger');
const IPlugin = defIntf<Plugin>('Plugin');
const IApp = defIntf<App>('App');

const AuthPlugin = defComp('authPlugin')
  .as(IPlugin.multi)
  .build(() => {
    return {
      name: 'auth',
      run: () => 'auth ready',
    };
  });

// Another component can contribute to the same multi interface.
const MetricsPlugin = defComp('metricsPlugin')
  .as(IPlugin.multi)
  .build(() => {
    return {
      name: 'metrics',
      run: () => 'metrics ready',
    };
  });

// A component can also be created first and attached to an interface later.
const AuditPlugin = defComp('auditPlugin').build(() => {
  return {
    name: 'audit',
    run: () => 'audit ready',
  };
});

// Optional dependencies resolve to undefined when nothing is registered.
// The second argument is Plugin[] because IPlugin.multi was provided.
const AppComponent = defComp('app')
  .provide(ILogger.optional, IPlugin.multi)
  .as(IApp)
  .build((logger, plugins) => {
    return {
      boot() {
        logger?.info('Booting app');
        return plugins.map((plugin) => `${plugin.name}: ${plugin.run()}`);
      },
    };
  });

const container = new Container()
  .register(AuthPlugin)
  .register(MetricsPlugin)
  .register(AuditPlugin, IPlugin.multi)
  .register(AppComponent);

// Optional logger is not registered in this example.
const logger = await container.get(ILogger.optional);
const plugins = await container.get(IPlugin.multi);
const app = await container.get(IApp);

console.log(`Optional logger registered: ${logger !== undefined}`);
console.log(
  `Registered plugins: ${plugins.map((plugin) => plugin.name).join(', ')}`,
);
console.log(app.boot().join('\n'));
