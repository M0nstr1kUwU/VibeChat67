<script setup lang="ts">
import type { Message } from "../types/message";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { convertFileSrc } from "@tauri-apps/api/core";

const props = defineProps<{
  message: Message;
}>();

const emit = defineEmits<{
  imageLoaded: [];
}>();

const isImage = computed(() => {
  return props.message.body.startsWith("__IMAGE__:");
});

const imagePath = computed(() => {
  if (!isImage.value) return "";

  const path = props.message.body.substring("__IMAGE__:".length);

  return convertFileSrc(path, "asset");
});

const isPreviewOpen = ref(false);
const zoom = ref(1);

function openImage() {
  if (!isImage.value) return;

  zoom.value = 1;
  isPreviewOpen.value = true;
  document.body.style.overflow = "hidden";
}

function closeImage() {
  isPreviewOpen.value = false;
  zoom.value = 1;
  document.body.style.overflow = "";
}

function handleWheel(event: WheelEvent) {
  if (!isPreviewOpen.value) return;

  event.preventDefault();

  if (event.deltaY < 0) {
    zoom.value = Math.min(zoom.value + 0.1, 5);
  } else {
    zoom.value = Math.max(zoom.value - 0.1, 0.5);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && isPreviewOpen.value) {
    closeImage();
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("wheel", handleWheel, { passive: false });
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("wheel", handleWheel);
  document.body.style.overflow = "";
});
</script>

<template>
  <article class="message">
    <template v-if="isImage">
      <img
          class="message-image"
          :src="imagePath"
          alt="Чёткая фотка"
          @load="emit('imageLoaded')"
          @click="openImage"
      />
    </template>
    <p v-else>
      {{ message.body }}
    </p>
  </article>
  <Teleport to="body">
    <div
        v-if="isPreviewOpen"
        class="image-preview"
        @click.self="closeImage"
    >
      <button
          class="close-button"
          type="button"
          title="Закрыть"
          @click="closeImage"
      >
        ✕
      </button>

      <div class="zoom-container">
        <img
            class="preview-image"
            :src="imagePath"
            alt=""
            :style="{
              transform: `scale(${zoom})`
            }"
            @click.stop
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.message {
  align-self: flex-end;
  max-width: 70%;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #386be0;
}

.message p {
  margin: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.message footer {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 6px;
  color: #ccd8f7;
  font-size: 10px;
}

.message-image {
  display: block;
  max-width: 320px;
  max-height: 320px;
  width: auto;
  height: auto;
  border-radius: 8px;
  object-fit: contain;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.message-image:hover {
  transform: scale(1.02);
  opacity: 0.92;
}

.image-preview {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 50px;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(4px);
  cursor: zoom-out;
  overflow: hidden;
}

.zoom-container {
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  display: block;
  max-width: 95vw;
  max-height: 90vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  cursor: default;
  transform-origin: center center;
  transition: transform 0.12s ease;
}

.close-button {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 1px solid #454954;
  border-radius: 50%;
  background: rgba(32, 35, 42, 0.95);
  color: #ffffff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
      background 0.15s ease,
      transform 0.15s ease,
      border-color 0.15s ease;
}

.close-button:hover {
  background: #343842;
  border-color: #5a6070;
  transform: scale(1.05);
}

.close-button:active {
  transform: scale(0.95);
}
</style>
