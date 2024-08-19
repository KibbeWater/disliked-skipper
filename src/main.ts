import { createApp, h } from "vue";
import { defineCustomElement } from "./api/CustomElement/apiCustomElement.ts";
import { createPinia } from "pinia";

import { useMusicKit } from "./api/MusicKit.ts";
import { PluginAPI } from "./api/PluginAPI";
import MySettings from "./components/MySettings.vue";
import config from "./plugin.config.ts";
import { customElementName } from "./utils";
import { fetchRatings } from "./utils/ratings.ts";
import { useConfig } from "./config.ts";

/**
 * Initializing a Vue app instance so we can use things like Pinia.
 */
const pinia = createPinia();
const pluginApp = createApp(h("div"));
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
  name: "Dislikes Skipper",
  identifier: config.identifier,
  /**
   * Defining our custom settings panel element
   */
  SettingsElement: customElementName("settings"),
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
    const musicKit = useMusicKit();
    musicKit.addEventListener(
      "queueItemsDidChange",
      (queue: { id: string }[]) => {
        const cfg = useConfig();
        if (!cfg.enableSkipping || !cfg.enableCache) return; // This is a pre-caching check, dont run if caching is disabled

        fetchRatings(queue.map((item) => item.id));
      },
    );
    musicKit.addEventListener(
      "queuePositionDidChange",
      async ({
        oldPosition,
        position,
      }: {
        oldPosition: number;
        position: number;
      }) => {
        if (position === -1) return;

        const cfg = useConfig();
        if (!cfg.enableSkipping) return;

        const curSong = musicKit.queue.currentItem;
        const ratings = await fetchRatings([curSong.id]);

        if (ratings[curSong.id]?.rating !== "disliked") return;
        const direction = position > oldPosition ? "forward" : "backward";
        if (direction === "forward") musicKit.skipToNextItem();
        else musicKit.skipToPreviousItem();
        console.log(
          `[Dislikes Skipper] Skipped ${direction} from disliked song "${curSong.attributes.artistName} - ${curSong.attributes.name.trim()}"`,
        );
      },
    );
  },
} as PluginAPI;
