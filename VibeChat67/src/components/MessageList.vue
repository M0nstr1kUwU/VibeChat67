<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import MessageBubble from './MessageBubble.vue';
import type { Message } from "../types/message";


const props = defineProps<{
  messages: Message[];
}>();

//==============================================

const messagesContainer = ref<HTMLElement | null>(null);
async function scrollToBottom() {
  await nextTick();

  if (!messagesContainer.value) return;

  messagesContainer.value.scrollTop =
      messagesContainer.value.scrollHeight;
}

watch(
    () => props.messages.length,
    async () => {
      await scrollToBottom();
    }
);

//==============================================
</script>

<template>
  <div class="messages"
       ref="messagesContainer"

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