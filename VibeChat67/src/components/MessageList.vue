<script setup lang="ts">
import MessageBubble from './MessageBubble.vue';
import type { Message } from "../types/message";

defineProps<{
  messages: Message[];
}>();
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