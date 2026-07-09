import {
  CircularDependencyError,
  Container,
  InterfaceAlreadyRegisteredError,
  InterfaceNotRegisteredError,
  defComp,
  defIntf,
} from '../lib';

const IConfig = defIntf<{ readonly value: string }>('Config');

// Resolving a required interface without registration throws immediately.
try {
  new Container().get(IConfig);
} catch (error) {
  if (error instanceof InterfaceNotRegisteredError) {
    console.log(`Missing interface: ${error.interfaceName}`);
  }
}

// Singular interfaces can have only one registered implementation.
try {
  const ConfigA = defComp('configA')
    .as(IConfig)
    .build(() => {
      return { value: 'A' };
    });
  const ConfigB = defComp('configB')
    .as(IConfig)
    .build(() => {
      return { value: 'B' };
    });

  new Container().register(ConfigA).register(ConfigB);
} catch (error) {
  if (error instanceof InterfaceAlreadyRegisteredError) {
    console.log(`Duplicate interface: ${error.interfaceName}`);
  }
}

const IA = defIntf<object>('A');
const IB = defIntf<object>('B');

// A -> B -> A is detected before any factory result is returned.
try {
  const ComponentA = defComp('componentA')
    .provide(IB)
    .as(IA)
    .build(() => {
      return {};
    });
  const ComponentB = defComp('componentB')
    .provide(IA)
    .as(IB)
    .build(() => {
      return {};
    });

  await new Container().register(ComponentA).register(ComponentB).get(IA);
} catch (error) {
  if (error instanceof CircularDependencyError) {
    console.log(`Circular path: ${error.path.join(' -> ')}`);
  }
}
