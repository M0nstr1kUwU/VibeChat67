<script setup lang="ts">
import { onMounted, ref, nextTick } from "vue";
import Database from "@tauri-apps/plugin-sql";

interface Message {
  id: number;
  author: string;
  body: string;
  created_at: string;
}

const draft = ref("");
const messages = ref<Message[]>([]);
const status = ref("Подключение...");

const messagesContainer = ref<HTMLElement | null>(null);

let db: Database | null = null;
let initializing = false;

async function loadMessages() {
  if (!db) return;

  try {
    messages.value = await db.select<Message[]>(
        "SELECT id, author, body, created_at FROM messages ORDER BY id ASC"
    );

    await scrollToBottom();
  } catch (err) {
    console.error("Ошибка загрузки сообщений:", err);
    status.value = "Ошибка загрузки сообщений";
  }
}

async function scrollToBottom() {
  await nextTick();

  if (!messagesContainer.value) return;

  messagesContainer.value.scrollTop =
      messagesContainer.value.scrollHeight;
}

async function initDatabase() {
  // Не подключаемся несколько раз
  if (initializing || db) return;

  initializing = true;
  status.value = "Подключение...";

  try {
    db = await Database.load("sqlite:messenger.db");

    console.log("SQLite подключен");

    await loadMessages();

    status.value = "Подключено";
  } catch (err) {
    console.error("Ошибка подключения к БД:", err);

    db = null;
    status.value = "Ошибка подключения к БД";
  } finally {
    initializing = false;
  }
}

async function sendMessage() {
  const body = draft.value.trim();

  if (!body) return;

  if (!db) {
    console.warn("БД данных ещё не подключена");
    return;
  }

  try {
    await db.execute(
        "INSERT INTO messages (author, body) VALUES ($1, $2)",
        ["Вы", body]
    );
    draft.value = "";
    await loadMessages();
  } catch (err) {
    console.error("Ошибка отправки сообщения:", err);
    status.value = "Ошибка отправки сообщения";
  }
}

onMounted(() => {
  initDatabase();
});
</script>

<template>
  <main class="app">
    <header class="header">
      <div>
        <h1>Vibe Chat 67</h1>
        <p>{{ status }}</p>
      </div>
      <span class="badge">
        Локально
      </span>
    </header>
    <section class="chat">
      <div class="chat-info">
        <h2>Первый чат</h2>
        <p>Ваш первый локальный мессенджер</p>
      </div>
      <div class="messages"
           ref="messagesContainer"
      >
        <div
            v-if="messages.length === 0"
            class="empty"
        >
          <strong class="warn-l">
            Здесь пока что пусто
          </strong>
          <span class="warn-l">
            Напишите первое сообщение
          </span>
        </div>
        <article
            v-for="message in messages"
            :key="message.id"
            class="message"
        >
          <p>{{ message.body }}</p>
          <footer>
            <span>{{ message.author }}</span>
            <span>|</span>
            <span>{{ message.created_at }}</span>
          </footer>
        </article>
      </div>

      <form
          class="composer"
          @submit.prevent="sendMessage"
      >
        <input
            v-model="draft"
            type="text"
            placeholder="Сообщение"
            autocomplete="off"
        />
        <button
            type="submit"
            :disabled="!draft.trim() || !db"
        >
          Отправить
        </button>
      </form>
    </section>
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

.header {
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid #292c34;
  background: #17191f;
}

.header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #8f96a3;
}

.badge {
  padding: 6px 12px;
  border: 1px solid #343842;
  border-radius: 6px;
  color: #afb5c0;
  background: #20232a;
  font-size: 12px;
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

.empty strong {
  color: #c8ccd4;
  font-size: 14px;
}

.empty span {
  font-size: 13px;
}

.message {
  align-self: flex-end;
  max-width: 70%;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #386be0;
}

.message p {
  margin: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.message footer {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 6px;
  color: #ccd8f7;
  font-size: 10px;
}

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