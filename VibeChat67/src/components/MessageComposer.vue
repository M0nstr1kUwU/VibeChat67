<script setup lang="ts">
import { ref, nextTick } from "vue";
import EmojiPicker from "./EmojiPicker.vue";


const draft = ref("");
const inputRef = ref<HTMLInputElement | null>(null);
const emj = ref(false);

const emit = defineEmits<{
  send: [body: string];
}>();

function submitMessage() {
  const body = draft.value.trim();

  if (!body) return;

  emit("send", body);

  draft.value = "";
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

  const newCursorPosition = start + emoji.length;

  input.focus();
  input.setSelectionRange(
      newCursorPosition,
      newCursorPosition
  );
}

function CloseEmj() {
  emj.value = !emj.value;
}


</script>

<template>
  <form
      class="composer"
      @submit.prevent="submitMessage"
  >
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
    >
      ☢
    </button>

    <button
        type="submit"
        :disabled="!draft.trim()"
    >
      Отправить
    </button>
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

.input-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
}

.input-wrapper input {
  width: 100%;
  min-width: 0;

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

  padding: 0;

  border: 1px solid #343842;
  border-radius: 8px;

  background: #20232a;
  color: #f2f3f5;

  cursor: pointer;

  font-size: 20px;

  transition:
      background 0.15s ease,
      border-color 0.15s ease;
}

.emoji-button:hover {
  background: #2a2d35;
  border-color: #4f7fea;
}

.composer > button[type="submit"] {
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