<script setup lang="ts">
import { useConfig } from "../config";

const cfg = useConfig()
</script>

<template>
  <div class="q-px-lg plugin-base" style="display: flex;flex-direction: column;gap:20px;">
    <h2 style="font-size: 20px;font-weight:600;margin:0;">Dislikes Skipper settings</h2>
    <div style="width: 100%;">
      <label style="display: flex;align-items: center;justify-content: space-between;">Enable Dislikes Skipping
        <input type="checkbox" v-model="cfg.enableSkipping" switch />
      </label>
    </div>
    <div style="width: 100%;display: flex;flex-direction: column;gap:8px"><label
        style="display: flex;align-items: center;justify-content: space-between;">Enable
        Caching
        <input type="checkbox" v-model="cfg.enableCache" switch />
      </label>
      <div v-if="cfg.enableCache">
        <label style="display: flex;align-items: center;justify-content: space-between;">
          Cache Duration (min)
          <input type="number" v-model="cfg.cacheDuration" style="width: 100px;" />
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
