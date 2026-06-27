export class ContainerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InterfaceAlreadyRegisteredError extends ContainerError {
  constructor(readonly interfaceName: string) {
    super(`Interface "${interfaceName}" is already registered`);
  }
}

export class InterfaceNotRegisteredError extends ContainerError {
  constructor(readonly interfaceName: string) {
    super(`Interface "${interfaceName}" is not registered`);
  }
}

export class CircularDependencyError extends ContainerError {
  constructor(readonly path: readonly string[]) {
    super(`Circular dependency detected: ${path.join(' → ')}`);
  }
}
