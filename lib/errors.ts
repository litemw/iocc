/** Base class for all container-specific errors. */
export class ContainerError extends Error {
  /**
   * Creates a container error.
   *
   * @param message Human-readable error message.
   */
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown when a singular interface is registered more than once. */
export class InterfaceAlreadyRegisteredError extends ContainerError {
  /**
   * Creates a duplicate-registration error.
   *
   * @param interfaceName Name of the already registered interface.
   */
  constructor(readonly interfaceName: string) {
    super(`Interface "${interfaceName}" is already registered`);
  }
}

/** Thrown when a required singular interface is not registered. */
export class InterfaceNotRegisteredError extends ContainerError {
  /**
   * Creates a missing-registration error.
   *
   * @param interfaceName Name of the missing required interface.
   */
  constructor(readonly interfaceName: string) {
    super(`Interface "${interfaceName}" is not registered`);
  }
}

/** Thrown when the container detects a dependency cycle. */
export class CircularDependencyError extends ContainerError {
  /**
   * Creates a circular-dependency error.
   *
   * @param path Component names in the detected dependency cycle.
   */
  constructor(readonly path: readonly string[]) {
    super(`Circular dependency detected: ${path.join(' → ')}`);
  }
}
