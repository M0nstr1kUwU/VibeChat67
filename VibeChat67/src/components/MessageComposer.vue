<script setup lang="ts">
import { ref, nextTick, onMounted } from "vue";
import EmojiPicker from "./EmojiPicker.vue";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";

const draft = ref("");
const inputRef = ref<HTMLInputElement | null>(null);
const emj = ref(false);

const recentImages = ref<string[]>([]);
const showRecentImages = ref(false);

const emit = defineEmits<{
  send: [body: string];
}>();

function submitMessage() {
  const body = draft.value.trim();

  if (!body) return;

  emit("send", body);

  draft.value = "";
}

async function selectImage() {
  try {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: "Изображения",
          extensions: [
            "png",
            "jpg",
            "jpeg",
            "gif",
            "webp",
            "bmp"
          ],
        },
      ],
    });

    if (!selected || Array.isArray(selected)) {
      return;
    }

    const savedPath = await invoke<string>(
        "save_attachment",
        {
          sourcePath: selected,
        }
    );

    emit("send", `__IMAGE__:${savedPath}`);

    await loadRecentImages();
    showRecentImages.value = false;
  } catch (err) {
    console.error("Ошибка сохранения изображения:", err);
  }
}

async function loadRecentImages() {
  try {
    recentImages.value = await invoke<string[]>(
        "get_recent_attachments"
    );
  } catch (err) {
    console.error(
        "Ошибка загрузки недавних фото:",
        err
    );
  }
}

function getImageUrl(path: string) {
  return convertFileSrc(path, "asset");
}

function toggleRecentImages() {
  showRecentImages.value = !showRecentImages.value;

  if (showRecentImages.value) {
    loadRecentImages();
  }
}

function sendRecentImage(path: string) {
  emit("send", `__IMAGE__:${path}`);
  showRecentImages.value = false;
}

async function addEmoji(emoji: string) {
  const input = inputRef.value;

  if (!input) {
    draft.value += emoji;
    return;
  }

  const start = input.selectionStart ?? draft.value.length;
  const end = input.selectionEnd ?? draft.value.length;
  draft.value =
      draft.value.slice(0, start) +
      emoji +
      draft.value.slice(end);
  emj.value = false;
  await nextTick();
  const newCursorPosition =
      start + emoji.length;
  input.focus();
  input.setSelectionRange(
      newCursorPosition,
      newCursorPosition
  );
}

function CloseEmj() {
  emj.value = !emj.value;
}
onMounted(() => {
  loadRecentImages();
});
</script>

<template>
  <form
      class="composer"
      @submit.prevent="submitMessage"
  >
    <div class="file-picker">
      <button
          type="button"
          class="file-button"
          title="Изображения"
          @click="toggleRecentImages"
      > 📎 </button>

      <div
          v-if="showRecentImages"
          class="image-menu"
      >
        <button
            type="button"
            class="choose-photo-button"
            @click="selectImage"
        >
          <span class="choose-photo-icon"> 📁 </span>
          <span class="choose-photo-text">
            <strong>Выбрать фото</strong>
            <small>
              Открыть проводник
            </small>
          </span>
        </button>
        <div class="menu-divider"></div>
        <div class="recent-section">
          <div class="recent-images-title">
            Недавние фото
          </div>
          <div
              v-if="recentImages.length === 0"
              class="recent-images-empty"
          > Здесь появятся отправленные фото </div>
          <div
              v-else
              class="recent-images-grid"
          >
            <button
                v-for="image in recentImages"
                :key="image"
                type="button"
                class="recent-image"
                title="Отправить это фото"
                @click="sendRecentImage(image)"
            >
              <img
                  :src="getImageUrl(image)"
                  alt="Недавнее фото"
              />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="input-wrapper">
      <input
          ref="inputRef"
          v-model="draft"
          type="text"
          placeholder="Сообщение"
          autocomplete="off"
          @focus="emj = false"
      />
      <EmojiPicker
          v-if="emj"
          @select="addEmoji"
      />
    </div>
    <button
        type="button"
        class="emoji-button"
        @click="CloseEmj"
    > ☢ </button>
    <button
        type="submit"
        :disabled="!draft.trim()"
    > Отправить </button>
  </form>
</template>

<style scoped>
.composer {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #252830;
  background: #17191f;
}

.file-picker {
  position: relative;
  flex-shrink: 0;
}

.file-button {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid #343842;
  border-radius: 8px;
  background: #20232a;
  color: #f2f3f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.file-button:hover {
  background: #2a2d35;
  border-color: #4f7fea;
  color: #ffffff;
}

.file-button:active {
  transform: scale(0.95);
}

.image-menu {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  width: 320px;
  padding: 10px;
  background: #20232a;
  border: 1px solid #343842;
  border-radius: 10px;
  box-shadow: 0 10px 35px rgba(0, 0, 0, 0.45);
  z-index: 1000;
}

.choose-photo-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #f2f3f5;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.choose-photo-button:hover {
  background: #2a2d35;
}

.choose-photo-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: #30343d;
  font-size: 18px;
}

.choose-photo-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.choose-photo-text strong {
  font-size: 13px;
  font-weight: 600;
}

.choose-photo-text small {
  color: #858c98;
  font-size: 11px;
}


.menu-divider {
  height: 1px;
  margin: 8px 2px;
  background: #343842;
}

.recent-section {
  padding: 4px 2px 2px;
}

.recent-images-title {
  margin: 4px 6px 10px;
  color: #f2f3f5;
  font-size: 13px;
  font-weight: 600;
}

.recent-images-grid {
  display: grid;
  grid-template-columns:
    repeat(4, 1fr);
  gap: 7px;
  max-height: 230px;
  overflow-y: auto;
  padding: 2px;
}

.recent-image {
  width: 65px;
  height: 65px;
  padding: 0;
  border: 1px solid #343842;
  border-radius: 6px;
  background: #17191f;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease;
}

.recent-image:hover {
  border-color: #4f7fea;
  transform: scale(1.04);
}

.recent-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.recent-images-empty {
  padding: 18px 8px;
  text-align: center;
  color: #777e8b;
  font-size: 12px;
}

.input-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
}

.input-wrapper input {
  width: 100%;
  min-width: 0;
  height: 44px;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1px solid #343842;
  border-radius: 6px;
  outline: none;
  color: #f2f3f5;
  background: #20232a;
  font: inherit;
}

.input-wrapper input::placeholder {
  color: #777e8b;
}

.input-wrapper input:focus {
  border-color: #4f7fea;
}

.emoji-button {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid #343842;
  border-radius: 8px;
  background: #20232a;
  color: #f2f3f5;
  cursor: pointer;
  font-size: 20px;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.emoji-button:hover {
  background: #2a2d35;
  border-color: #4f7fea;
}

.composer > button[type="submit"] {
  height: 44px;
  padding: 0 18px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: white;
  background: #386be0;
  font: inherit;
  font-weight: 600;
  transition: background 0.15s ease;
}

.composer > button[type="submit"]:hover:not(:disabled) {
  background: #4779e8;
}

.composer > button[type="submit"]:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>