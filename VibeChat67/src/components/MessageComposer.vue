<script setup lang="ts">
import { ref } from 'vue';
import { Message } from "../types/message";

const draft = ref<Message[]>([]);

const emit = defineEmits<{
  send: [body:string];
}>();

function submitMessage() {
  const body = draft.value.toString().trim();

  if (!body) return;
  emit("send", body);
}
</script>

<template>
  <form
      class="composer"
      @submit.prevent="submitMessage"
  >
    <input
        v-model="draft"
        type="text"
        placeholder="Сообщение"
        autocomplete="off"
    />
    <button
        type="submit"
        :disabled="!draft.toString().trim()"
    >
      Отправить
    </button>
  </form>
</template>

<style scoped>

.composer {
  flex: 0 0 auto;
  flex-shrink: 0;
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #252830;
  background: #17191f;
}

.composer input {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid #343842;
  border-radius: 6px;
  outline: none;
  color: #f2f3f5;
  background: #20232a;
  font: inherit;
}

.composer input::placeholder {
  color: #777e8b;
}

.composer input:focus {
  border-color: #4f7fea;
}

.composer button {
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

.composer button:hover:not(:disabled) {
  background: #4779e8;
}

.composer button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

</style>