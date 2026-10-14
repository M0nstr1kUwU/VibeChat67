<script setup lang="ts">
import {computed, nextTick, ref, watch,} from "vue";
import MessageBubble from "./MessageBubble.vue";
import type {Message} from "../types/message";
import type {UserAccount} from "../types/user";

const props = defineProps<{
  messages: Message[];
  currentUserId: number;
  users: UserAccount[];
}>();

const emit = defineEmits<{
  edit: [
    messageId: number,
    body: string
  ];

  delete: [
    messageId: number
  ];
}>();

const messagesContainer = ref<HTMLElement | null>(null);
const usersById = computed(() => {
      const map = new Map<number, UserAccount>();
      for (const user of props.users) {
        map.set(user.id, user);
      }
      return map;
    });

watch(
    () => props.messages.length,
    async () => {
      await scrollToBottom();
    },
    {
      flush: "post",
    }
);

async function scrollToBottom() {
  await nextTick();
  const container = messagesContainer.value;

  if (!container) {
    return;
  }

  container.scrollTop = container.scrollHeight;
  requestAnimationFrame(() => {
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  });

  setTimeout(() => {
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, 100);
}
</script>

<template>
  <div ref="messagesContainer" class="messages">
    <div v-if="messages.length === 0" class="empty"></div>

    <MessageBubble
        v-for="message in messages"
        :key="message.id"
        :message="message"
        :current-user-id="currentUserId"
        :author-user="usersById.get(message.user_id) ?? null"
        @edit="(messageId, body) => emit('edit', messageId, body)" @delete="messageId => emit('delete', messageId)"
    />
  </div>
</template>

<style scoped>

.messages {
  --messages-bg: #111318;
  --scrollbar-thumb: #3a3e49;
  --scrollbar-hover: #535968;
  --muted-color: #858c98;

  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 28px;
  background: var(--messages-bg, transparent);
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb, #3a3e49) transparent;
}

.messages::-webkit-scrollbar {
  width: 7px;
}

.messages::-webkit-scrollbar-track {
  background: transparent;
}

.messages::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: var(--scrollbar-thumb, #3a3e49);
}

.messages::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-hover, #535968);
}

.empty {
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
  color: var(--muted-color, #858c98);
}

@media (max-width: 700px) {
  .messages {
    gap: 13px;
    padding: 16px 12px;
  }
}
</style>