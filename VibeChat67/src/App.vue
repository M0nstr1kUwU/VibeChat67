<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Database from "@tauri-apps/plugin-sql";

import MessageList from "./components/MessageList.vue";
import AppHeader from "./components/AppHeader.vue";
import MessageComposer from "./components/MessageComposer.vue";
import ChatSidebar from "./components/ChatSidebar.vue";
import type { ChatItem, SearchUser } from "./components/ChatSidebar.vue";
import Settings from "./components/Settings.vue";
import AuthView from "./components/AuthView.vue";

import type { Message } from "./types/message";
import type { UserAccount } from "./types/user";

import {
  loadUsers,
  restoreSession,
  logoutUser,
} from "./services/userStorage";

const status = ref("Подключение...");
const messages = ref<Message[]>([]);
const users = ref<UserAccount[]>([]);
const chats = ref<ChatItem[]>([]);

const currentUserId = ref<number | null>(null);
const activeChatId = ref<number | null>(null);
const authReady = ref(false);

type AppTab = "chat" | "settings";

const currentTab = ref<AppTab>("chat");

const isChatTab = computed(() => currentTab.value === "chat");
const isSettingsTab = computed(() => currentTab.value === "settings");

const currentUser = computed(() => {
  if (currentUserId.value === null) return null;

  return users.value.find(
      user => user.id === currentUserId.value
  ) ?? null;
});

const activeChat = computed(() =>
    chats.value.find(chat => chat.id === activeChatId.value) ?? null
);

const searchableUsers = computed<SearchUser[]>(() =>
    users.value.map(user => ({
      id: user.id,
      nickname: user.nickname,
      login: user.login,
    }))
);

let db: Database | null = null;
let initializing = false;

function switchTab(tab: AppTab) {
  currentTab.value = tab;
}

async function ensureDatabaseStructure() {
  if (!db) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      user_id INTEGER NOT NULL DEFAULT 0,
      body TEXT NOT NULL
    )
  `);

  const columns = await db.select<{ name: string }[]>(
      "PRAGMA table_info(messages)"
  );

  if (!columns.some(column => column.name === "user_id")) {
    await db.execute(`
      ALTER TABLE messages
      ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0
    `);
  }

  if (!columns.some(column => column.name === "chat_id")) {
    await db.execute(`
      ALTER TABLE messages
      ADD COLUMN chat_id INTEGER DEFAULT NULL
    `);
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_one_id INTEGER NOT NULL,
      user_two_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_one_id, user_two_id),
      CHECK(user_one_id < user_two_id)
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id
    ON messages(chat_id, id)
  `);
}

async function saveUsersToDatabase() {
  if (!db) return;

  for (const user of users.value) {
    await db.execute(
        `
        INSERT INTO users (id, name)
        VALUES ($1, $2)
        ON CONFLICT(id)
        DO UPDATE SET name = excluded.name
      `,
        [user.id, user.nickname]
    );
  }
}

async function loadChats() {
  if (!db || currentUserId.value === null) return;

  const rows = await db.select<{
    id: number;
    user_one_id: number;
    user_two_id: number;
    last_message: string | null;
  }[]>(
      `
      SELECT
        c.id,
        c.user_one_id,
        c.user_two_id,
        (
          SELECT m.body
          FROM messages m
          WHERE m.chat_id = c.id
          ORDER BY m.id DESC
          LIMIT 1
        ) AS last_message
      FROM chats c
      WHERE c.user_one_id = $1 OR c.user_two_id = $1
      ORDER BY
        COALESCE(
          (
            SELECT MAX(m.id)
            FROM messages m
            WHERE m.chat_id = c.id
          ),
          0
        ) DESC,
        c.id DESC
    `,
      [currentUserId.value]
  );

  chats.value = rows.map(row => {
    const partnerId =
        row.user_one_id === currentUserId.value
            ? row.user_two_id
            : row.user_one_id;

    const partner = users.value.find(
        user => user.id === partnerId
    );

    return {
      id: row.id,
      partnerId,
      name: partner?.nickname ?? `Пользователь ${partnerId}`,
      login: partner?.login ?? "",
      lastMessage: row.last_message ?? "",
    };
  });

  if (
      activeChatId.value !== null &&
      !chats.value.some(chat => chat.id === activeChatId.value)
  ) {
    activeChatId.value = null;
    messages.value = [];
  }
}

async function loadMessages() {
  if (!db || activeChatId.value === null) {
    messages.value = [];
    return;
  }

  try {
    messages.value = await db.select<Message[]>(
        `
        SELECT
          m.id,
          m.user_id,
          COALESCE(u.name, m.author, 'Пользователь') AS author,
          m.body
        FROM messages m
        LEFT JOIN users u ON u.id = m.user_id
        WHERE m.chat_id = $1
        ORDER BY m.id ASC
      `,
        [activeChatId.value]
    );
  } catch (error) {
    console.error("Ошибка загрузки сообщений:", error);
    status.value = "Ошибка загрузки сообщений";
  }
}

async function openChat(chatId: number) {
  if (!chats.value.some(chat => chat.id === chatId)) return;

  activeChatId.value = chatId;
  currentTab.value = "chat";

  await loadMessages();
}

async function createOrOpenChat(partnerId: number) {
  if (!db || currentUserId.value === null) return;

  if (partnerId === currentUserId.value) {
    status.value = "Нельзя создать чат с самим собой";
    return;
  }

  const partner = users.value.find(user => user.id === partnerId);

  if (!partner) {
    status.value = "Пользователь не найден";
    return;
  }

  try {
    const userOneId = Math.min(currentUserId.value, partnerId);
    const userTwoId = Math.max(currentUserId.value, partnerId);

    await db.execute(
        `
        INSERT INTO chats (user_one_id, user_two_id)
        VALUES ($1, $2)
        ON CONFLICT(user_one_id, user_two_id) DO NOTHING
      `,
        [userOneId, userTwoId]
    );

    const rows = await db.select<{ id: number }[]>(
        `
        SELECT id FROM chats
        WHERE user_one_id = $1 AND user_two_id = $2
        LIMIT 1
      `,
        [userOneId, userTwoId]
    );

    if (!rows.length) {
      throw new Error("Не удалось создать чат");
    }

    await loadChats();
    await openChat(rows[0].id);

    status.value = "Подключено";
  } catch (error) {
    console.error("Ошибка создания чата:", error);
    status.value = "Ошибка создания чата";
  }
}

async function deleteChat(chatId: number) {
  if (!db) return;

  try {
    await db.execute(
        "DELETE FROM messages WHERE chat_id = $1",
        [chatId]
    );

    await db.execute(
        `
        DELETE FROM chats
        WHERE id = $1
          AND (user_one_id = $2 OR user_two_id = $2)
      `,
        [chatId, currentUserId.value]
    );

    if (activeChatId.value === chatId) {
      activeChatId.value = null;
      messages.value = [];
    }

    await loadChats();
    status.value = "Чат удалён";
  } catch (error) {
    console.error("Ошибка удаления чата:", error);
    status.value = "Ошибка удаления чата";
  }
}

async function sendMessage(body: string) {
  if (!db || currentUserId.value === null) return;

  if (activeChatId.value === null) {
    status.value = "Сначала выберите чат";
    return;
  }

  const user = currentUser.value;
  if (!user) return;

  try {
    await db.execute(
        `
        INSERT INTO messages (author, user_id, body, chat_id)
        VALUES ($1, $2, $3, $4)
      `,
        [user.nickname, user.id, body, activeChatId.value]
    );

    await loadMessages();
    await loadChats();
    status.value = "Подключено";
  } catch (error) {
    console.error("Ошибка отправки сообщения:", error);
    status.value = "Ошибка отправки сообщения";
  }
}

async function editMessage(messageId: number, body: string) {
  if (!db || currentUserId.value === null) return;

  try {
    await db.execute(
        `
          UPDATE messages
          SET body = $1
          WHERE id = $2
            AND user_id = $3
            AND chat_id = $4
        `,
        [body, messageId, currentUserId.value, activeChatId.value]
    );

    await loadMessages();
    await loadChats();
    status.value = "Подключено";
  } catch (error) {
    console.error("Ошибка редактирования сообщения:", error);
    status.value = "Ошибка редактирования сообщения";
  }
}

async function deleteMessage(messageId: number) {
  if (!db || currentUserId.value === null) return;

  try {
    await db.execute(
        `
          DELETE FROM messages
          WHERE id = $1
            AND user_id = $2
            AND chat_id = $3
        `,
        [messageId, currentUserId.value, activeChatId.value]
    );

    await loadMessages();
    await loadChats();
    status.value = "Подключено";
  } catch (error) {
    console.error("Ошибка удаления сообщения:", error);
    status.value = "Ошибка удаления сообщения";
  }
}

async function initDatabase() {
  if (initializing) return;

  initializing = true;
  status.value = "Подключение...";

  try {
    if (!db) {
      db = await Database.load("sqlite:messenger.db");
    }

    await ensureDatabaseStructure();
    await saveUsersToDatabase();
    await loadChats();

    console.log("SQLite подключен");
    status.value = "Подключено";
  } catch (error) {
    console.error("Ошибка подключения к БД:", error);
    status.value = "Ошибка подключения к БД";
  } finally {
    initializing = false;
  }
}

async function handleAuthenticated(user: UserAccount) {
  const index = users.value.findIndex(item => item.id === user.id);

  if (index === -1) {
    users.value.push(user);
  } else {
    users.value[index] = user;
  }

  currentUserId.value = user.id;
  currentTab.value = "chat";
  activeChatId.value = null;
  messages.value = [];
  chats.value = [];

  await initDatabase();
}

async function handleProfileUpdated(user: UserAccount) {
  const index = users.value.findIndex(item => item.id === user.id);

  if (index === -1) {
    users.value.push(user);
  } else {
    users.value[index] = user;
  }

  try {
    await saveUsersToDatabase();
    await loadChats();
  } catch (error) {
    console.error("Ошибка сохранения профиля:", error);
  }
}

async function handleLogout() {
  try {
    await logoutUser();
  } catch (error) {
    console.error("Ошибка выхода:", error);
  }

  currentUserId.value = null;
  activeChatId.value = null;
  currentTab.value = "chat";
  messages.value = [];
  chats.value = [];
  status.value = "Вход не выполнен";
}

async function initializeApp() {
  try {
    users.value = await loadUsers();

    const sessionUser = await restoreSession(users.value);

    if (sessionUser) {
      currentUserId.value = sessionUser.id;
      await initDatabase();
    } else {
      status.value = "Вход не выполнен";
    }
  } catch (error) {
    console.error("Ошибка запуска приложения:", error);
    status.value = "Ошибка запуска";
  } finally {
    authReady.value = true;
  }
}

onMounted(() => {
  void initializeApp();
});
</script>

<template>
  <div v-if="!authReady" class="startup">
    <div class="startup-spinner"></div>
    <span>Запуск Vibe Chat 67...</span>
  </div>

  <AuthView
      v-else-if="!currentUser"
      @authenticated="handleAuthenticated"
  />

  <main v-else class="app">
    <AppHeader
        :status="status"
        :user="currentUser"
    />

    <div class="app-tabs">
      <button
          type="button"
          :class="{ active: isChatTab }"
          @click="switchTab('chat')"
      >💬</button>

      <button
          type="button"
          :class="{ active: isSettingsTab }"
          @click="switchTab('settings')"
      >⚙️</button>
    </div>

    <section v-if="isChatTab" class="workspace">
      <ChatSidebar
          :chats="chats"
          :users="searchableUsers"
          :current-user-id="currentUser.id"
          :active-chat-id="activeChatId"
          @select-chat="openChat"
          @select-user="createOrOpenChat"
          @delete-chat="deleteChat"
      />

      <section class="chat">
        <template v-if="activeChat">
          <header class="chat-info">
            <h2>{{ activeChat.name }}</h2>
            <p>@{{ activeChat.login }}</p>
          </header>

          <MessageList
              :key="activeChat.id"
              :messages="messages"
              :current-user-id="currentUser.id"
              :users="users"
              @edit="editMessage"
              @delete="deleteMessage"
          />

          <MessageComposer @send="sendMessage" />
        </template>

        <div v-else class="no-chat">
          <h2>Vibe Chat 67</h2>
        </div>
      </section>
    </section>

    <Settings
        v-else
        :user="currentUser"
        @profile-updated="handleProfileUpdated"
        @logout="handleLogout"
    />
  </main>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(html) {
  background: #111318;
  color-scheme: dark;
}

:global(body) {
  margin: 0;
  width: 100%;
  height: 100vh;
  min-width: 320px;
  overflow: hidden;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", sans-serif;
}

:global(#app) {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #111318;
  color: #f2f3f5;
}

.startup {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: 100%;
  height: 100vh;
  background: #111318;
  color: #f2f3f5;
  font-size: 13px;
}

.startup-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #30343d;
  border-top-color: #4f7fea;
  border-radius: 50%;
  animation: startup-spin 0.8s linear infinite;
}

@keyframes startup-spin {
  to {
    transform: rotate(360deg);
  }
}

.app-tabs {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 48px;
  padding: 6px 24px;
  border-bottom: 1px solid #252830;
  background: #111318;
}

.app-tabs button {
  width: 40px;
  height: 34px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #858c98;
  cursor: pointer;
  font: inherit;
  font-size: 15px;
}

.app-tabs button:hover {
  background: #20232a;
  color: #f2f3f5;
}

.app-tabs button.active {
  background: #303b59;
  border-color: #3d4d75;
  color: #fff;
}

.workspace {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.chat {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.chat-info {
  flex-shrink: 0;
  padding: 18px 24px;
  border-bottom: 1px solid #252830;
  border-radius: 5px;
  background: #272930;
}

.chat-info h2 {
  margin: 0;
  font-size: 16px;
}

.chat-info p {
  margin: 5px 0 0;
  color: #858c98;
  font-size: 13px;
}

.no-chat {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: #858c98;
  text-align: center;
}

.no-chat h2 {
  margin: 0;
  color: #f2f3f5;
  font-size: 18px;
}

.no-chat p {
  margin: 0;
  font-size: 13px;
}


@media (max-width: 650px) {
  .workspace {
    flex-direction: column;
  }

  .chat {
    flex: 1;
  }
}
</style>