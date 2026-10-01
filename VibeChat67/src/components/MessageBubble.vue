<script setup lang="ts">
import type { Message } from "../types/message";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { convertFileSrc } from "@tauri-apps/api/core";

const props = defineProps<{
  message: Message;
  currentUserId: number;
}>();

const isOwnMessage = computed(() => {
  return (
      props.message.user_id ===
      props.currentUserId
  );
});

const emit = defineEmits<{
  edit: [messageId: number, body: string];
  delete: [messageId: number];
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

const isEditing = ref(false);
const editText = ref("");

const isPreviewOpen = ref(false);
const zoom = ref(1);

function startEdit() {
  if (!isOwnMessage.value) return;
  if (isImage.value) return;

  editText.value = props.message.body;
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
  editText.value = "";
}

function saveEdit() {
  const newBody = editText.value.trim();

  if (!newBody) {
    return;
  }

  if (newBody === props.message.body) {
    cancelEdit();
    return;
  }

  emit("edit", props.message.id, newBody);

  isEditing.value = false;
  editText.value = "";
}

function handleEditKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    cancelEdit();
    return;
  }

  if (event.key === "Enter" && event.ctrlKey) {
    event.preventDefault();
    saveEdit();
  }
}

function deleteMessage() {
  if (!isOwnMessage.value) return;
  const confirmed = window.confirm("Удалить?");
  if (!confirmed) {
    return;
  }
  emit("delete", props.message.id);
}

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

  if (event.key === "Escape" && isEditing.value) {
    cancelEdit();
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
  <article class="message-wrapper"
      :class="{
      own: isOwnMessage,
      other: !isOwnMessage
    }">
    <div class="author-name"
         :class="{ 'own-name': isOwnMessage }">
      {{ message.author }}
    </div>
    <article class="message">
      <template v-if="isEditing">
        <div class="edit-box">
          <textarea
              v-model="editText"
              class="edit-input"
              rows="3"
              autofocus
              @keydown="handleEditKeydown"
          ></textarea>

          <div class="edit-actions">
            <button
                type="button"
                class="cancel-button"
                @click="cancelEdit"
            >
              Отмена
            </button>

            <button
                type="button"
                class="save-button"
                :disabled="!editText.trim()"
                @click="saveEdit"
            >
              Сохранить
            </button>
          </div>
        </div>
      </template>

      <template v-else-if="isImage">
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

    <div
        v-if="!isEditing && isOwnMessage"
        class="message-actions"
    >
      <button
          v-if="!isImage"
          type="button"
          class="action-button"
          title="Изменить"
          @click="startEdit"
      >
        ✎
      </button>

      <button
          type="button"
          class="action-button delete-button"
          title="Удалить"
          @click="deleteMessage"
      >
        🗑
      </button>
    </div>
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
.message-wrapper {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-wrapper.own {
  align-self: flex-end;
  align-items: flex-end;
}

.message-wrapper.other {
  align-self: flex-start;
  align-items: flex-start;
}

.author-name {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  background: #30343d;
  color: #aab3c2;
  font-size: 12px;
  font-weight: 600;
}

.author-name.own-name {
  background: #384b82;
  color: #dce6ff;
}

.message {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgb(38 29 106 / 0.66);
}

.message-wrapper.other .message {
  background: #20232a;
}

.message p {
  margin: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.message-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.message-wrapper:hover .message-actions {
  opacity: 1;
  pointer-events: auto;
}

.action-button {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #343842;
  border-radius: 6px;
  background: #20232a;
  color: #d9dde5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
}

.action-button:hover {
  background: #2a2d35;
  border-color: #2c3851;
  color: #ffffff;
}

.delete-button:hover {
  border-color: #d45c5c;
}

.edit-box {
  min-width: 260px;
  max-width: 420px;
}

.edit-input {
  width: 100%;
  min-height: 80px;
  resize: vertical;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #333b53;
  border-radius: 7px;
  outline: none;
  background: #20232a;
  color: #f2f3f5;
  font: inherit;
  line-height: 1.45;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 8px;
}

.edit-actions button {
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.cancel-button {
  border: 1px solid #343842;
  background: #20232a;
  color: #d5d9e1;
}

.cancel-button:hover {
  background: #2a2d35;
}

.save-button {
  border: none;
  background: #ffffff;
  color: #1a1c21;
  font-weight: 600;
}

.save-button:hover:not(:disabled) {
  background: #e7eaf0;
}

.save-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
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
  transition:
      transform 0.15s ease,
      opacity 0.15s ease;
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