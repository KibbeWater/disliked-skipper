import { useCPlugin } from '../api/CPlugin';
import { useMusicKit } from '../api/MusicKit';
import { CustomElements } from './../main';

/**
 * Use this when you want to reference a custom element for this plugin.
 * @param name The name of the custom element.
 * @returns
 */
export function customElementName(name: keyof typeof CustomElements) {
    return `${useCPlugin().ce_prefix}-${name}`;
}

export function waitForMusicKit(): Promise<void> {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            const musicKit = useMusicKit();
            if (musicKit?.addEventListener) {
                clearInterval(interval);
                resolve();
            }
        }, 100);
    });
}
