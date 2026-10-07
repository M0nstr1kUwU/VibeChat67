<script setup lang="ts">
import {computed, onMounted, ref} from "vue";
import Database from "@tauri-apps/plugin-sql";
import MessageList from "./components/MessageList.vue";
import AppHeader from "./components/AppHeader.vue";
import MessageComposer from "./components/MessageComposer.vue";
import Settings from "./components/Settings.vue";
import type { Message, User } from "./types/message";

const status = ref("Подключение...");
const messages = ref<Message[]>([]);
const users = ref<User[]>([
  {
    id: 0,
    name: "ЗУМЕР67",
  },
  {
    id: 1,
    name: "БУМЕР1998",
  },
  {
    id: 2,
    name: "OLEG",
  },
]);

const currentUserId = ref(0);
type AppTab = "chat" | "settings";

const currentTab = ref<AppTab>("chat");

const isChatTab = computed(() => currentTab.value === "chat");
const isSettingsTab = computed(() => currentTab.value === "settings");

function switchTab(tab: AppTab) {
  currentTab.value = tab;
}

const currentUser = computed(() => {
  return users.value.find(
      user => user.id === currentUserId.value
  );
});

let db: Database | null = null;
let initializing = false;

async function ensureDatabaseStructure() {
  if (!db) return;

  const columns = await db.select<{ name: string }[]>(
      "PRAGMA table_info(messages)"
  );

  const hasUserId = columns.some(
      column => column.name === "user_id"
  );

  if (!hasUserId) {
    await db.execute(
        `
        ALTER TABLE messages
        ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0
        `
    );
  }

  await db.execute(
      `
      CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL
      )
      `
  );
}

async function loadMessages() {
  if (!db) return;

  try {
    messages.value = await db.select<Message[]>(
        `
        SELECT
            messages.id,
            messages.user_id,
            users.name AS author,
            messages.body
        FROM messages
        LEFT JOIN users
            ON users.id = messages.user_id
        ORDER BY messages.id ASC
        `
    );
  } catch (err) {
    console.error(
        "Ошибка загрузки сообщений:",
        err
    );
  }
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
        [user.id, user.name]
    );
  }
}

function switchUser(userId: number) {
  const userExists = users.value.some(
      user => user.id === userId
  );

  if (!userExists) return;

  currentUserId.value = userId;
}

async function initDatabase() {
  if (initializing || db) return;
  initializing = true;
  status.value = "Подключение...";

  try {
    db = await Database.load("sqlite:messenger.db");
    await ensureDatabaseStructure();
    await saveUsersToDatabase();
    await loadMessages();
    console.log("SQLite подключен");
    status.value = "Подключено";
  } catch (err) {
    console.error("Ошибка подключения к БД:", err);
    db = null;
    status.value = "Ошибка подключения к БД";
  } finally {
    initializing = false;
  }
}

async function sendMessage(body: string) {
  if (!db) {
    console.warn("БД данных ещё не подключена");
    return;
  }
  const user = currentUser.value;
  if (!user) {
    return;
  }
  try {
    await db.execute(
        `
        INSERT INTO messages
            (author, user_id, body)
        VALUES
            ($1, $2, $3)
        `,
        [
          user.name,
          user.id,
          body
        ]
    );
    await loadMessages();
  } catch (err) {
    console.error("Ошибка отправки сообщения:", err);
    status.value = "Ошибка отправки сообщения";
  }
}

async function editMessage(
    messageId: number,
    body: string
) {
  if (!db) {
    console.warn("БД данных ещё не подключена");
    return;
  }
  try {
    await db.execute(
        `
    UPDATE messages
    SET body = $1
    WHERE id = $2
      AND user_id = $3
    `,
        [
          body,
          messageId,
          currentUserId.value
        ]
    );
    await loadMessages();
    status.value = "Подключено";
  } catch (err) {
    console.error("Ошибка редактирования сообщения:", err);
    status.value = "Ошибка редактирования сообщения";
  }
}

async function deleteMessage(messageId: number) {
  if (!db) {
    console.warn("БД данных ещё не подключена");
    return;
  }
  try {
    await db.execute(
        `
    DELETE FROM messages
    WHERE id = $1
      AND user_id = $2
    `,
        [
          messageId,
          currentUserId.value
        ]
    );
    await loadMessages();
    status.value = "Подключено";
  } catch (err) {
    console.error("Ошибка удаления сообщения:", err);
    status.value = "Ошибка удаления сообщения";
  }
}

onMounted(() => {
  initDatabase();
});
</script>

<template>
  <main class="app">
    <AppHeader :status="status" />
    <div class="app-tabs">
      <button
          type="button"
          :class="{ active: isChatTab }"
          @click="switchTab('chat')"
      >
        💬
      </button>
      <button
          type="button"
          :class="{ active: isSettingsTab }"
          @click="switchTab('settings')"
      >
        ⚙️
      </button>
    </div>
    <section v-if="isChatTab" class="chat">
      <div class="user-switcher">
        <button
            v-for="user in users"
            :key="user.id"
            type="button"
            @click="switchUser(user.id)"
        >
          Пользователь {{ user.id }}: {{ user.name }}
        </button>
      </div>
      <div class="chat-info">
        <h2>Ваш Первый чат</h2>
        <p><strong>{{ currentUser?.name }}</strong></p>
        <p>ID: <strong>{{ currentUserId }}</strong></p>
      </div>
      <MessageList
          :messages="messages"
          :current-user-id="currentUserId"
          @edit="editMessage"
          @delete="deleteMessage"
      />
      <MessageComposer @send="sendMessage" />
    </section>
    <Settings v-else />
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
  font-family:
      Inter,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
}

:global(#app) {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.app {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #111318;
  color: #f2f3f5;
}

.user-switcher {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 24px;
  border-bottom: 1px solid #252830;
  background: #111318;
}

.user-switcher button {
  height: 34px;
  padding: 0 12px;
  border: 1px solid #30343d;
  border-radius: 6px;
  background: #20232a;
  color: #f2f3f5;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}

.user-switcher button:hover {
  background: #2a2e37;
}

.chat {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-info {
  flex-shrink: 0;
  padding: 20px 24px;
  border-bottom: 1px solid #252830;
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
  color: #ffffff;
}
</style>