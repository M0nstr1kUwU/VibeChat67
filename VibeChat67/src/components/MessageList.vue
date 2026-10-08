<script setup lang="ts">
import {
  computed,
  nextTick,
  ref,
  watch,
} from "vue";

import MessageBubble from "./MessageBubble.vue";

import type {
  Message,
} from "../types/message";

import type {
  UserAccount,
} from "../types/user";

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

const messagesContainer =
    ref<HTMLElement | null>(null);

const usersById =
    computed(() => {
      const map =
          new Map<number, UserAccount>();

      for (
          const user
          of props.users
          ) {
        map.set(
            user.id,
            user
        );
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

  const container =
      messagesContainer.value;

  if (!container) {
    return;
  }

  container.scrollTop =
      container.scrollHeight;

  requestAnimationFrame(() => {
    if (!container) {
      return;
    }

    container.scrollTop =
        container.scrollHeight;
  });

  setTimeout(() => {
    if (!container) {
      return;
    }

    container.scrollTop =
        container.scrollHeight;
  }, 100);
}
</script>

<template>
  <div
      ref="messagesContainer"
      class="messages"
  >
    <div
        v-if="messages.length === 0"
        class="empty"
    ></div>

    <MessageBubble
        v-for="message in messages"
        :key="message.id"
        :message="message"
        :current-user-id="
        currentUserId
      "
        :author-user="
        usersById.get(
          message.user_id
        ) ?? null
      "
        @edit="
        (messageId, body) =>
          emit(
            'edit',
            messageId,
            body
          )
      "
        @delete="
        messageId =>
          emit(
            'delete',
            messageId
          )
      "
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