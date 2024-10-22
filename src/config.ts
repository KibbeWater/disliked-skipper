/**
 * Example for how you may want to setup your configuration.
 */

import { setupConfig } from './api/Config';

export const cfg = setupConfig({
    enableSkipping: <boolean>true,
    enableCache: <boolean>true,
    cacheDuration: <number>60,
    skipSongOnDislike: <boolean>true,
    // patchRatingsAPI: <boolean>true,
});

export function useConfig() {
    return cfg.value;
}
