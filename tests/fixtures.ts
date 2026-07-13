import { defIntf } from '../lib';

export const IConfig = defIntf<{ str: string }>('Config');
export const IUser = defIntf<{ greet(): string }>('User');
export const IPlugin = defIntf<{ name: string }>('Plugin');
export const IOptional = defIntf<{ value: number }>('Optional');
