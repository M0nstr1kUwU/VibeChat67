<script setup lang="ts">
import {onMounted, ref} from "vue";

import Database from "@tauri-apps/plugin-sql";

import MessageList from "./components/MessageList.vue";
// import { Message } from "./types/message";
import AppHeader from "./components/AppHeader.vue";
import MessageComposer from "./components/MessageComposer.vue";
import {Message} from "./types/message.ts";

const status = ref("Подключение...");

const messages = ref<Message[]>([]);


let db: Database | null = null;
let initializing = false;

//===========================


async function loadMessages() {
  if (!db) return;

  try {
    messages.value = await db.select<Message[]>(
        "SELECT id, author, body FROM messages ORDER BY id ASC"
    );

  } catch (err) {
    console.error("Ошибка загрузки сообщений:", err);
  }
}


//===========================

async function initDatabase() {
  if (initializing || db) return;
  initializing = true;
  status.value = "Подключение...";

  try {
    db = await Database.load("sqlite:messenger.db");
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

  try {
    await db.execute(
        "INSERT INTO messages (author, body) VALUES ($1, $2)",
        ["Вы", body]
    );
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
    <AppHeader :status="status"/>
    <section class="chat">
      <div class="chat-info">
        <h2>Первый чат</h2>
        <p>Ваш первый локальный мессенджер</p>
      </div>
      <MessageList :messages="messages"/>
      <MessageComposer @send="sendMessage"/>
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
</style>