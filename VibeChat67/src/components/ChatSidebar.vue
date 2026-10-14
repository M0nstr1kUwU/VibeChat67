<script setup lang="ts">
import { computed, ref } from "vue";

export interface ChatItem {
  id: number;
  partnerId: number;
  name: string;
  login: string;
  lastMessage: string;
}

export interface SearchUser {
  id: number;
  nickname: string;
  login: string;
}

const props = defineProps<{
  chats: ChatItem[];
  users: SearchUser[];
  currentUserId: number;
  activeChatId: number | null;
}>();

const emit = defineEmits<{
  "select-chat": [chatId: number];
  "select-user": [userId: number];
  "delete-chat": [chatId: number];
}>();

const search = ref("");

const filteredUsers = computed(() => {
  const query = search.value.trim().toLowerCase();

  if (!query) return [];

  return props.users
      .filter(user => user.id !== props.currentUserId)
      .filter(user =>
          user.nickname.toLowerCase().includes(query) ||
          user.login.toLowerCase().includes(query)
      )
      .slice(0, 20);
});

function deleteChat(chat: ChatItem) {
  if (!window.confirm(`Удалить чат с ${chat.name}?`)) return;

  emit("delete-chat", chat.id);
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-heading">
      <h2>Сообщения</h2>
      <span class="chat-count">{{ chats.length }}</span>
    </div>

    <div class="search-wrapper">
      <span class="search-icon">⌕</span>
      <input
          v-model="search"
          type="search"
          placeholder="Найти пользователя..."
          autocomplete="off"
      />
      <button
          v-if="search"
          class="clear-search"
          type="button"
          @click="search = ''"
      >×</button>
    </div>

    <section v-if="search.trim()" class="search-results">
      <p class="section-title">Пользователи</p>

      <button
          v-for="user in filteredUsers"
          :key="user.id"
          class="user-result"
          type="button"
          @click="emit('select-user', user.id)"
      >
        <span class="avatar">
          {{ user.nickname.slice(0, 2).toUpperCase() }}
        </span>

        <span class="user-info">
          <strong>{{ user.nickname }}</strong>
          <small>@{{ user.login }}</small>
        </span>

        <span class="open-icon">＋</span>
      </button>

      <p v-if="filteredUsers.length === 0" class="empty">
        Пользователи не найдены
      </p>
    </section>

    <section v-else class="chat-list">
      <p class="section-title">Ваши чаты</p>

      <div v-if="chats.length === 0" class="empty">
        <span class="empty-icon">♥</span>
        <strong>Пока нет чатов</strong>
      </div>

      <div
          v-for="chat in chats"
          :key="chat.id"
          class="chat-item"
          :class="{ active: activeChatId === chat.id }"
      >
        <button
            type="button"
            class="chat-select"
            @click="emit('select-chat', chat.id)"
        >
          <span class="avatar">
            {{ chat.name.slice(0, 2).toUpperCase() }}
          </span>

          <span class="chat-info">
            <strong>{{ chat.name }}</strong>
            <small>{{ chat.lastMessage || '@' + chat.login }}</small>
          </span>
        </button>

        <button
            class="delete-chat"
            type="button"
            title="Удалить чат"
            aria-label="Удалить чат"
            @click.stop="deleteChat(chat)"
        >×</button>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 300px;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #17191f;
  border-right: 1px solid #252830;
}

.sidebar-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px 14px;
}

.sidebar-heading h2 {
  margin: 0;
  font-size: 17px;
}

.chat-count {
  padding: 3px 7px;
  border-radius: 10px;
  background: #303b59;
  color: #dce6ff;
  font-size: 11px;
}

.search-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 12px 16px;
  padding: 0 10px;
  height: 38px;
  border: 1px solid #343842;
  border-radius: 8px;
  background: #20232a;
}

.search-icon {
  color: #858c98;
  font-size: 22px;
}

.search-wrapper input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #f2f3f5;
  font: inherit;
  font-size: 12px;
}

.search-wrapper input::placeholder {
  color: #858c98;
}

.clear-search,
.delete-chat {
  border: 0;
  background: transparent;
  color: #858c98;
  cursor: pointer;
  font-size: 19px;
}

.search-results,
.chat-list {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
}

.section-title {
  margin: 0;
  padding: 0 16px 10px;
  color: #858c98;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.7px;
}

.user-result,
.chat-select {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border: 0;
  background: transparent;
  color: #f2f3f5;
  text-align: left;
  cursor: pointer;
}

.user-result:hover,
.chat-item:hover,
.chat-item.active {
  background: #252a35;
}

.chat-item {
  display: flex;
  align-items: center;
  padding-right: 8px;
}

.chat-select {
  flex: 1;
  min-width: 0;
}

.avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #384b82;
  color: white;
  font-size: 11px;
  font-weight: 700;
}

.user-info,
.chat-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.user-info strong,
.chat-info strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.user-info small,
.chat-info small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #858c98;
  font-size: 11px;
}

.open-icon {
  color: #8baaff;
  font-size: 19px;
}

.delete-chat {
  width: 28px;
  height: 30px;
  flex-shrink: 0;
  opacity: 0;
}

.chat-item:hover .delete-chat,
.delete-chat:focus-visible {
  opacity: 1;
}

.delete-chat:hover {
  color: #ff7777;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 24px 18px;
  color: #858c98;
  text-align: center;
  font-size: 12px;
}

.empty strong {
  color: #d9dde5;
}

.empty-icon {
  font-size: 28px;
}

@media (max-width: 650px) {
  .sidebar {
    width: 100%;
    min-width: 0;
    max-height: 40%;
    border-right: 0;
    border-bottom: 1px solid #252830;
  }

  .delete-chat {
    opacity: 1;
  }
}
</style>