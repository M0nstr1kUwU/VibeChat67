<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import MessageBubble from "./MessageBubble.vue";
import type { Message } from "../types/message";

const props = defineProps<{
  messages: Message[];
}>();

const messagesContainer = ref<HTMLElement | null>(null);

async function scrollToBottom() {
  await nextTick();

  const container = messagesContainer.value;
  if (!container) return;

  // Первый скролл после отрисовки сообщений
  container.scrollTop = container.scrollHeight;

  // Даём изображениям время изменить высоту контейнера
  requestAnimationFrame(() => {
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  });

  // Дополнительная страховка после загрузки картинок
  setTimeout(() => {
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, 100);
}

watch(
    () => props.messages.length,
    () => {
      scrollToBottom();
    },
    { immediate: true }
);
</script>

<template>
  <div
      ref="messagesContainer"
      class="messages"
  >
    <div
        v-if="messages.length === 0"
        class="empty"
    >
    </div>

    <MessageBubble
        v-for="message in messages"
        :key="message.id"
        :message="message"
        @image-loaded="scrollToBottom"
    />
  </div>
</template>

<style scoped>

.messages {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  scroll-behavior: smooth;
}

.empty {
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
  color: #858c98;
}

</style>