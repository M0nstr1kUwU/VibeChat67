<script setup lang="ts">
import { ref } from "vue";
import {loginUser, registerUser,} from "../services/userStorage";
import type { UserAccount } from "../types/user";

type AuthMode = | "login" | "register";
const mode = ref<AuthMode>("login");
const login = ref("");
const nickname = ref("");
const password = ref("");
const repeatPassword = ref("");
const error = ref("");
const loading = ref(false);
const emit = defineEmits<{
  authenticated: [user: UserAccount];
}>();
function switchMode(newMode: AuthMode) {
  mode.value = newMode;
  error.value = "";
  password.value = "";
  repeatPassword.value = "";
}

async function submit() {
  error.value = "";

  if (loading.value) {
    return;
  }

  if (!login.value.trim()) {
    error.value = "Введите логин.";
    return;
  }

  if (mode.value === "register" && !nickname.value.trim()) {
    error.value = "Введите никнейм.";
    return;
  }
  if (!password.value) {
    error.value = "Введите пароль.";
    return;
  }
  if (mode.value === "register" && password.value !== repeatPassword.value) {
    error.value = "Пароли не совпадают.";
    return;
  }
  loading.value = true;
  try {
    let user: UserAccount;
    if (mode.value === "login") {
      user = await loginUser(login.value, password.value);
    } else {
      user = await registerUser(login.value, nickname.value, password.value);
    }
    emit("authenticated", user);
    password.value = "";
    repeatPassword.value = "";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Произошла ошибка.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <div class="auth-logo">V</div>
      <h1>Vibe Chat 67</h1>
      <p class="auth-subtitle">Локально</p>
      <div class="auth-tabs">
        <button
            type="button"
            :class="{
            active: mode === 'login'
          }"
            @click="switchMode('login')"
        >Войти</button>
        <button
            type="button"
            :class="{
            active: mode === 'register'
          }"
            @click="switchMode('register')"
        >Регистрация</button>
      </div>
      <form class="auth-form" @submit.prevent="submit">
        <label>Логин<input
              v-model="login"
              type="text"
              placeholder="username"
              autocomplete="username"
              maxlength="32"
          />
        </label>
        <label
            v-if="mode === 'register'"
        >Никнейм<input
              v-model="nickname"
              type="text"
              placeholder="Никнейм"
              autocomplete="nickname"
              maxlength="32"
          />
        </label>

        <label>
          Пароль<input
              v-model="password"
              type="password"
              placeholder="Минимум 6 символов"
              autocomplete="current-password"
          />
        </label>
        <label v-if="mode === 'register'"
        >Повторите пароль<input
              v-model="repeatPassword"
              type="password"
              placeholder="Повторите пароль"
              autocomplete="new-password"
          />
        </label>
        <div
            v-if="error"
            class="auth-error"
        >
          {{ error }}
        </div>
        <button
            type="submit"
            class="auth-submit"
            :disabled="loading"
        >
          {{
            loading
                ? "Загрузка..."
                : mode === "login"
                    ? "Войти"
                    : "Создать аккаунт"
          }}
        </button>
      </form>
      <div class="auth-footer"></div>
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #111318;
  color: #f2f3f5;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 32px;
  border: 1px solid #292c34;
  border-radius: 14px;
  background: #17191f;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}

.auth-logo {
  width: 52px;
  height: 52px;
  margin: 0 auto 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: #386be0;
  color: #ffffff;
  font-size: 24px;
  font-weight: 800;
}

.auth-card h1 {
  margin: 0;
  text-align: center;
  font-size: 22px;
}

.auth-subtitle {
  margin: 7px 0 24px;
  text-align: center;
  color: #858c98;
  font-size: 13px;
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  margin-bottom: 20px;
  border-radius: 8px;
  background: #111318;
}

.auth-tabs button {
  height: 38px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #858c98;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}

.auth-tabs button:hover {
  color: #f2f3f5;
}

.auth-tabs button.active {
  background: #303b59;
  color: #ffffff;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.auth-form label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #9aa2af;
  font-size: 12px;
}

.auth-form input {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #30343d;
  border-radius: 7px;
  outline: none;
  background: #111318;
  color: #f2f3f5;
  font: inherit;
}

.auth-form input:focus {
  border-color: #4f7fea;
}

.auth-form input::placeholder {
  color: #646b78;
}

.auth-error {
  padding: 10px 12px;
  border: 1px solid
  rgba(212, 92, 92, 0.5);
  border-radius: 7px;
  background: rgba(212, 92, 92, 0.08);
  color: #ff8f8f;
  font-size: 12px;
  line-height: 1.4;
}

.auth-submit {
  height: 44px;
  margin-top: 4px;
  border: none;
  border-radius: 8px;
  background: #386be0;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  transition: background 0.15s ease, transform 0.1s ease;
}

.auth-submit:hover:not(:disabled) {
  background: #4779e8;
}

.auth-submit:active:not(:disabled) {
  transform: translateY(1px);
}

.auth-submit:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.auth-footer {
  margin-top: 18px;
  text-align: center;
  color: #646b78;
  font-size: 11px;
}
</style>