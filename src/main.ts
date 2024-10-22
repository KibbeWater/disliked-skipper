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

        // Here we add a custom button to the top right of the chrome
        waitForMusicKit().then(() => {
            console.log('[Dislikes Skipper] MusicKit is ready, adding event listeners');
            let lastPlayed: string;
            const musicKit = useMusicKit();
            musicKit.addEventListener('queueItemsDidChange', (queue: { id: string }[]) => {
                const cfg = useConfig();
                if (!cfg.enableSkipping || !cfg.enableCache) return; // This is a pre-caching check, dont run if caching is disabled

                fetchRatings(queue.map((item) => item.id));
            });
            musicKit.addEventListener('nowPlayingItemDidChange', async (args: { item: any }) => {
                const cfg = useConfig();
                if (!cfg.enableSkipping) return;

                const nowPlayingItem = args.item;
                if (!nowPlayingItem) return;

                const queue = musicKit.queue.items;
                const nowPlayingIndex = queue.findIndex((item: { id: string }) => item.id === nowPlayingItem.id);

                let direction: 'forward' | 'backward' | undefined;
                if (lastPlayed) {
                    direction = nowPlayingIndex > lastPlayed ? 'forward' : 'backward';
                } else if (!lastPlayed) {
                    direction = 'forward';
                }

                lastPlayed = nowPlayingIndex;

                if (!direction) return;

                const ratings = await fetchRatings([nowPlayingItem.id]);

                if (ratings[nowPlayingItem.id]?.rating !== 'disliked') return;
                if (direction === 'forward') musicKit.skipToNextItem();
                else musicKit.skipToPreviousItem();
                console.log(
                    `[Dislikes Skipper] Skipped ${direction} from disliked song "${nowPlayingItem.attributes.artistName} - ${nowPlayingItem.attributes.name.trim()}"`,
                );
            });
        });
    },
} as PluginAPI;
