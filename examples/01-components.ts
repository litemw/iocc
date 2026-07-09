import { Container, defComp } from '../lib';

// A component is both a provider and a token that can be resolved directly.
const Settings = defComp('settings').build(() => {
  // You can see factories called when they are requested
  console.log('settings factory called');

  return {
    appName: 'Standalone components',
    greeting: 'Hello',
  };
});

// Dependencies are declared with .provide(...) and arrive as factory arguments.
const Greeter = defComp('greeter')
  .provide(Settings)
  .build((cfg) => {
    console.log('greeter factory called');

    return {
      greet(name: string) {
        return `${cfg.greeting}, ${name} from ${cfg.appName}`;
      },
    };
  });

// Register components before resolving them from the container.
const container = new Container().register(Settings).register(Greeter);
console.log('Components registered');

// Factories are cached, so the second get(...) reuses the same instance.
const first = await container.get(Greeter);
const second = await container.get(Greeter);

console.log(first.greet('IOCC'));
console.log(`Same greeter instance: ${first === second}`);
