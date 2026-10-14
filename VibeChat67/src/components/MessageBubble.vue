<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from "vue";
import {convertFileSrc} from "@tauri-apps/api/core";
import type {Message} from "../types/message";
import type {UserAccount} from "../types/user";

const props = defineProps<{
  message: Message;
  currentUserId: number;
  authorUser?: UserAccount | null;
}>();

const isOwnMessage = computed(() => {
  return (props.message.user_id === props.currentUserId);
});

const authorName = computed(() => {
  return (props.authorUser?.nickname || props.message.author || "Пользователь");
});

const avatarUrl = computed(() => {
  const path = props.authorUser?.avatarPath;
  if (!path) {
    return "";
  }
  return convertFileSrc(path, "asset");
});

const avatarInitials = computed(() => {
  const name = authorName.value.trim();
  if (!name) {
    return "?";
  }
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
});

const emit = defineEmits<{ edit: [messageId: number, body: string];
  delete: [messageId: number];
  imageLoaded: [];
}>();

const isImage = computed(() => {
  return props.message.body.startsWith("__IMAGE__:");
});

const imagePath = computed(() => {
  if (!isImage.value) {
    return "";
  }
  const path = props.message.body.substring("__IMAGE__:".length);
  return convertFileSrc(path, "asset");
});

const isEditing = ref(false);
const editText = ref("");
const isPreviewOpen = ref(false);
const zoom = ref(1);

function startEdit() {
  if (!isOwnMessage.value) {
    return;
  }
  if (isImage.value) {
    return;
  }
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

function handleEditKeydown(
    event: KeyboardEvent
) {
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
  if (!isOwnMessage.value) {
    return;
  }
  const confirmed = window.confirm("Удалить сообщение?");
  if (!confirmed) {
    return;
  }
  emit("delete", props.message.id);
}

function openImage() {
  if (!isImage.value) {
    return;
  }
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
  if (!isPreviewOpen.value) {
    return;
  }
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
  window.addEventListener("wheel", handleWheel, {passive: false,});
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("wheel", handleWheel);
  document.body.style.overflow = "";
});
</script>

<template>
  <article
      class="message-wrapper"
      :class="{own: isOwnMessage, other: !isOwnMessage}"
  >
    <div class="author-row">
      <div class="author-avatar" :class="{own: isOwnMessage}">
        <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="authorName"
            @error="console.error('Не удалось загрузить аватар:', props.authorUser?.avatarPath)"
        />
        <span v-else>{{ avatarInitials }}</span>
      </div>
      <div class="author-name" :class="{'own-name':isOwnMessage}">{{ authorName }}</div>
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
            >Отмена</button>
            <button
                type="button"
                class="save-button"
                :disabled="!editText.trim()" @click="saveEdit"
            >Сохранить</button>
          </div>
        </div>
      </template>
      <template v-else-if="isImage">
        <img
            class="message-image"
            :src="imagePath"
            alt="Изображение"
            @load="emit('imageLoaded')" @click="openImage"
        />
      </template>
      <p v-else>{{ message.body }}</p>
    </article>
    <div
        v-if="!isEditing && isOwnMessage" class="message-actions"
    >
      <button
          v-if="!isImage"
          type="button"
          class="action-button"
          title="Изменить"
          @click="startEdit"
      >✎</button>
      <button
          type="button"
          class="action-button delete-button"
          title="Удалить"
          @click="deleteMessage"
      >🗑</button>
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
      >✕</button>
      <div class="zoom-container">
        <img
            class="preview-image"
            :src="imagePath"
            alt=""
            :style="{transform:`scale(${zoom})`}" @click.stop
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.message-wrapper {
  --avatar-bg: #384b82;
  --avatar-own-bg: #4a64a0;
  --author-tag-bg: #292d36;
  --author-tag-color: #b9c2d2;
  --author-own-tag-bg: #303f65;
  --author-own-tag-color: #e0e9ff;
  --message-border: #30343d;
  --message-bg: #20232a;
  --message-color: #f2f3f5;
  --message-own-border: #4165a8;
  --message-own-bg: #304b7d;
  --message-own-color: #f7f9ff;
  --action-border: #343842;
  --action-bg: #20232a;
  --action-color: #d9dde5;
  --action-hover-bg: #2a2d35;
  --action-hover-color: #ffffff;
  --input-border: #39445a;
  --input-bg: #191c22;
  --input-color: #f2f3f5;
  --accent: #4f7fea;

  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: fit-content;
  max-width: min(72%, 680px);
  min-width: 0;
}

.message-wrapper.own {
  align-self: flex-end;
  align-items: flex-end;
}

.message-wrapper.other {
  align-self: flex-start;
  align-items: flex-start;
}

.author-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 3px;
}

.author-avatar {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: var(--avatar-bg, #384b82);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  user-select: none;
}

.author-avatar.own {
  background: var(--avatar-own-bg, #4a64a0);
}

.author-avatar img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.author-name {
  display: inline-block;
  max-width: 300px;
  padding: 4px 9px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 7px;
  background: var(--author-tag-bg, #292d36);
  color: var(--author-tag-color, #b9c2d2);
  font-size: 11px;
  font-weight: 600;
}

.author-name.own-name {
  background: var(--author-own-tag-bg, #303f65);
  color: var(--author-own-tag-color, #e0e9ff);
}

.message {
  position: relative;
  max-width: 100%;
  min-width: 48px;
  margin: 0;
  padding: 11px 14px;
  overflow-wrap: anywhere;
  word-break: normal;
  border: 1px solid var(--message-border, #30343d);
  border-radius: 5px 17px 17px 17px;
  background: var(--message-bg, #20232a);
  color: var(--message-color, #f2f3f5);
  box-shadow: 0 2px 5px rgb(0 0 0 / 8%);
  transition:
      background 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease;
}

.message-wrapper.own .message {
  border-color: var(--message-own-border, #4165a8);
  border-radius: 17px 5px 17px 17px;
  background: var(--message-own-bg, #304b7d);
  color: var(--message-own-color, #f7f9ff);
}

.message p {
  margin: 0;
  color: inherit;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.message-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 3px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.message-wrapper:hover .message-actions,
.message-wrapper:focus-within .message-actions {
  opacity: 1;
  pointer-events: auto;
}

.action-button {
  width: 29px;
  height: 29px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--action-border, #343842);
  border-radius: 9px;
  background: var(--action-bg, #20232a);
  color: var(--action-color, #d9dde5);
  cursor: pointer;
  font-size: 13px;
  transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
}

.action-button:hover {
  border-color: var(--accent, #4f7fea);
  background: var(--action-hover-bg, #2a2d35);
  color: var(--action-hover-color, #fff);
}

.delete-button:hover {
  border-color: #d45c5c;
  color: #ff8b8b;
}

.edit-box {
  width: min(420px, 70vw);
  min-width: min(260px, 60vw);
}

.edit-input {
  width: 100%;
  min-height: 80px;
  resize: vertical;
  box-sizing: border-box;
  padding: 11px 12px;
  border: 1px solid var(--input-border, #39445a);
  border-radius: 10px;
  outline: none;
  background: var(--input-bg, #191c22);
  color: var(--input-color, #f2f3f5);
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
}

.edit-input:focus {
  border-color: var(--accent, #4f7fea);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 9px;
}

.edit-actions button {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.cancel-button {
  border: 1px solid var(--action-border, #343842);
  background: var(--action-bg, #20232a);
  color: var(--action-color, #d5d9e1);
}

.cancel-button:hover {
  background: var(--action-hover-bg, #2a2d35);
}

.save-button {
  border: 1px solid var(--accent, #4f7fea);
  background: var(--accent, #4f7fea);
  color: #fff;
  font-weight: 600;
}

.save-button:hover:not(:disabled) {
  filter: brightness(1.08);
}

.save-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.message-image {
  display: block;
  max-width: min(360px, 60vw);
  max-height: 360px;
  width: auto;
  height: auto;
  border-radius: 12px;
  object-fit: contain;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.message-image:hover {
  transform: scale(1.01);
  opacity: 0.95;
}

.image-preview {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 50px;
  background: rgb(0 0 0 / 84%);
  backdrop-filter: blur(5px);
  cursor: zoom-out;
  overflow: hidden;
}

.zoom-container {
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.preview-image {
  display: block;
  max-width: 95vw;
  max-height: 90vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 14px;
  box-shadow: 0 20px 60px rgb(0 0 0 / 60%);
  cursor: default;
  transform-origin: center center;
  transition: transform 0.12s ease;
}

.close-button {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 2;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 1px solid #454954;
  border-radius: 50%;
  background: rgb(32 35 42 / 95%);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, transform 0.15s ease;
}

.close-button:hover {
  background: #343842;
  transform: scale(1.05);
}

.close-button:active {
  transform: scale(0.95);
}

@media (hover: none) {
  .message-actions {
    opacity: 1;
    pointer-events: auto;
  }
}

@media (max-width: 700px) {
  .message-wrapper {
    max-width: 88%;
  }

  .message-image {
    max-width: min(260px, 70vw);
    max-height: 260px;
  }

  .image-preview {
    padding: 25px;
  }

  .preview-image {
    max-width: 90vw;
    max-height: 85vh;
  }
}
</style>