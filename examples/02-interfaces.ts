import { Container, defComp, defIntf } from '../lib';

type Config = {
  readonly serviceName: string;
};

type Logger = {
  info(message: string): void;
};

const IConfig = defIntf<Config>('Config');
const ILogger = defIntf<Logger>('Logger');
const IUserService = defIntf<{
  welcome(userName: string): string;
}>('UserService');

// .as(...) registers the component under an interface token.
const ConfigComponent = defComp('config')
  .as(IConfig)
  .build(() => {
    return {
      serviceName: 'Users',
    };
  });

// The factory return type is checked against ILogger by TypeScript.
const LoggerComponent = defComp('logger')
  .as(ILogger)
  .build(() => {
    return {
      info(message) {
        console.log(`[info] ${message}`);
      },
    };
  });

// Interface tokens can be used as dependencies, not only concrete components.
// The factory receives Config and Logger values in the same order.
const UserServiceComponent = defComp('userService')
  .provide(IConfig, ILogger)
  .as(IUserService)
  .build((config, logger) => {
    return {
      welcome(userName) {
        logger.info(`Greeting ${userName}`);
        return `Welcome to ${config.serviceName}, ${userName}`;
      },
    };
  });

const container = new Container()
  .register(ConfigComponent)
  .register(LoggerComponent)
  .register(UserServiceComponent);

// Resolving by interface hides the concrete component from the caller.
const userService = await container.get(IUserService);

console.log(userService.welcome('Vlad'));
