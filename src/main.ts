import { createApp, h } from 'vue';
import { defineCustomElement } from './api/CustomElement/apiCustomElement.ts';
import { createPinia } from 'pinia';

import { useMusicKit } from './api/MusicKit.ts';
import { PluginAPI } from './api/PluginAPI';
import MySettings from './components/MySettings.vue';
import config from './plugin.config.ts';
import { customElementName, waitForMusicKit } from './utils';
import { fetchRatings } from './utils/ratings.ts';
import { useConfig } from './config.ts';

/**
 * Initializing a Vue app instance so we can use things like Pinia.
 */
const pinia = createPinia();
const pluginApp = createApp(h('div'));
pluginApp.use(pinia);

/**
 * Custom Elements that will be registered in the app
 */
export const CustomElements = {
    settings: defineCustomElement(MySettings, {
        shadowRoot: false,
        appContext: pluginApp,
    }),
};

export default {
    name: 'Dislikes Skipper',
    identifier: config.identifier,
    /**
     * Defining our custom settings panel element
     */
    SettingsElement: customElementName('settings'),
    /**
     * Initial setup function that is executed when the plugin is loaded
     */
    setup() {
        // Temp workaround
        // @ts-ignore
        window.__VUE_OPTIONS_API__ = true;
        for (const [key, value] of Object.entries(CustomElements)) {
            const _key = key as keyof typeof CustomElements;
            customElements.define(customElementName(_key), value);
        }

        // Polyfill fetch to rewrite the ratings URL as a temporary workaround
        // Also does cache refetching
        const originalFunc = fetch;
        // @ts-ignore
        fetch = (url, opts) => {
            const musicKit = useMusicKit();
            const urlPath = url.match(/https?:\/\/[^\/]+(\/[^?#]*)/)?.[1] || ''; // const urlPath = new URL(url).pathname;
            if (urlPath.startsWith('/v1/me/ratings/songs') && (opts.method === 'PUT' || opts.method === 'DELETE')) {
                const songId = url.split('/').pop();
                const curSongId = musicKit.queue.currentItem.id;

                const body = JSON.parse(opts.body);
                if (
                    opts.method === 'PUT' &&
                    curSongId === songId &&
                    body.attributes.value === -1 &&
                    useConfig().skipSongOnDislike
                ) {
                    console.log('[Dislikes Skipper] Song has been rated, skipping to next song');
                    musicKit.skipToNextItem();
                }

                setTimeout(() => {
                    console.log('[Dislikes Skipper] Song has been rated, refetching ratings');
                    fetchRatings([songId], true);
                }, 1000);
            }
            if (urlPath.startsWith('/v1/me/ratings/song/') && (opts.method === 'PUT' || opts.method === 'DELETE')) {
                const cfg = useConfig();
                const curSongId = musicKit.queue.currentItem.id;

                const songId = url.split('/').pop();
                const newURL = cfg.patchRatingsAPI ? url.replace('ratings/song', 'ratings/songs') : url;
                setTimeout(() => {
                    console.log('[Dislikes Skipper] Song has been rated, refetching ratings');
                    fetchRatings([songId], true);
                }, 1000);
                if (cfg.patchRatingsAPI)
                    console.log('[Dislikes Skipper] [PATCH] Rewriting ratings URL to ' + newURL + ' from ' + url);

                const body = JSON.parse(opts.body);
                if (
                    opts.method === 'PUT' &&
                    useConfig().skipSongOnDislike &&
                    curSongId === songId &&
                    body.attributes.value === -1
                ) {
                    console.log('[Dislikes Skipper] Song has been rated, skipping to next song');
                    musicKit.skipToNextItem();
                }

                return originalFunc(newURL, opts);
            }
            return originalFunc(url, opts);
        };

        // Here we add a custom button to the top right of the chrome
        waitForMusicKit().then(() => {
            console.log('[Dislikes Skipper] MusicKit is ready, adding event listeners');
            const musicKit = useMusicKit();
            musicKit.addEventListener('queueItemsDidChange', (queue: { id: string }[]) => {
                const cfg = useConfig();
                if (!cfg.enableSkipping || !cfg.enableCache) return; // This is a pre-caching check, dont run if caching is disabled

                fetchRatings(queue.map((item) => item.id));
            });
            musicKit.addEventListener(
                'queuePositionDidChange',
                async ({ oldPosition, position }: { oldPosition: number; position: number }) => {
                    if (position === -1) return;

                    const cfg = useConfig();
                    if (!cfg.enableSkipping) return;

                    const curSong = musicKit.queue.currentItem;
                    const ratings = await fetchRatings([curSong.id]);

                    if (ratings[curSong.id]?.rating !== 'disliked') return;
                    const direction = position > oldPosition ? 'forward' : 'backward';
                    if (direction === 'forward') musicKit.skipToNextItem();
                    else musicKit.skipToPreviousItem();
                    console.log(
                        `[Dislikes Skipper] Skipped ${direction} from disliked song "${curSong.attributes.artistName} - ${curSong.attributes.name.trim()}"`,
                    );
                },
            );
        });
    },
} as PluginAPI;
