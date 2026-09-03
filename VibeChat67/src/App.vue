<script setup lang="ts">
// Импорт из vue 2 функции
// onMounted - запускает код после отображения всех компонентов
// ref - быстрая переменная
import {onMounted, ref} from "vue";
import Database from "@tauri-apps/plugin-sql";

interface Message {
  id: number;
  author: string,
  body: string,
  created_at: string
}

const draft = ref("");
const messages = ref<Message[]>([]);
const status = ref("Подключение...");

// Подключение к бд, пока его нет - используем null

let db: Database | null = null;

// Асинхронная функция загрузки сообщений из бд
async function loadMessages() {
  if (!db) return;
  messages.value = await db.select<Message[]>(
      "SELECT id, author, body, created_at FROM messages ORDER BY id ASC",
  );
}

async function sendMessages() {
  const body = draft.value.trim();
  if(!body) return;
  if (!db) return;
  await db.execute(
      "INSERT INTO messages (author, body) VALUES ($1, $2)",
      ["Вы", body]
  );

  draft.value = "";
  await loadMessages();

  onMounted(async () => {
    try{
      db = await Database.load("sqlite:messenger.db");

      await loadMessages();
    }
    catch(err){
      console.error(err);
      status.value = "Ошибка подключения к бд"
    }
  });
}

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
      <div class="chat-infi">
        <h2>Первый чат</h2>
        <p>Ваш первый локальный мессенджер</p>
      </div>
      <div
          v-if="messages.length === 0"
          class="empty"
      >
        <strong>
          Здесь пока что пусто
        </strong>
          <span>Напишите первое сообщение</span>
        <article
          v-for="message in messages"
          :key="message.id"
          class="message"
        >
          <p>{{ message.body }}</p>
          <footer>
            <span> {{ message.author}}</span>
            <span> | </span>
            <span> {{ message.created_at }}</span>
          </footer>
        </article>
      </div>
      <form
        class="composer"
        @submit="sendMessages"
      >
        <input
        v-model="draft"
        type="text"
        placeholder="Сообщение"
        autocomplete="off"
        />
        <button type="submit"> Отправить </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
:global(*){
  box-sizing: border-box;
}

:global(html){
  background: #111318;
  color-scheme: dark;
}

:global(body){
  margin: 0;
  font-family:
  Inter,
  system-ui,
  -apple-system,
  BlinckmacSystemFont,
  "Seqoe UI",
  sans-serif;
}

.app{
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid #292c34;
  background: #17191f;
}

.header h1{
  margin: 0;
  font-size: 18px;
}

.header p{
  margin: 4px 0 0;
  font-size: 12px;
  color: #8f96a3;
}

.badge{
  padding: 6px 12px;
  border: 1px solid #343842;
  border-radius: 6px;
  color: #afb5c0;
  background: #20232a;
  font-size: 12px;
}

.chat{
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.chat-info{
  padding: 20px 25px;
  border-bottom: 1px solid #252830;
}

.chat-info h2{
  margin: 0;
  font-size: 16px;
}
.chat-info p{
  margin: 5px 0 0;
  color: #858c98;
  font-size: 13px;
}

.messages{
  flex: 1;
  overflow-y: auto;
  flex-direction: column;
  gap: 10px;
  padding: 24px;
}

.empty{
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
  color: #858c98;
}

.message{
  align-self: flex-end;
  max-width: 70%;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #386be0;
}

.message p{
  margin: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.message footer{
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 6px;
  color: #ccd8f7;
  font-size: 10px;
}

.composer{
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #252830;
  background: #17191f;
}

.composer input{
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

.composer input:focus{
  border-color: #4f7fea;
}

.composer button{
  padding: 0 18px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: white;
  background: #386be0;
  font: inherit;
  font-weight: 600;
}

.composer button:hover{
  background: #4779e8;
}
</style>