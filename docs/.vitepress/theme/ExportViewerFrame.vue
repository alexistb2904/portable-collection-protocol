<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { withBase } from "vitepress";

const frame = ref<HTMLIFrameElement | null>(null);
const frameHeight = ref(1520);
const source = withBase("/viewer-embed/");

function handleMessage(event: MessageEvent) {
  if (event.source !== frame.value?.contentWindow) return;
  if (!event.data || event.data.type !== "portable-collection-viewer:height") return;

  const next = Number(event.data.height);
  if (!Number.isFinite(next)) return;

  frameHeight.value = Math.min(5000, Math.max(900, Math.ceil(next)));
}

onMounted(() => {
  window.addEventListener("message", handleMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
});
</script>

<template>
  <div class="export-viewer-frame-shell">
    <iframe
      ref="frame"
      class="export-viewer-frame"
      :src="source"
      :style="{ height: `${frameHeight}px` }"
      title="Portable collection export viewer"
      loading="eager"
    />
  </div>
</template>

<style scoped>
.export-viewer-frame-shell {
  width: 100%;
  margin: 24px 0 0;
}

.export-viewer-frame {
  display: block;
  width: 100%;
  min-height: 900px;
  border: 0;
  border-radius: 14px;
  background: transparent;
}
</style>
