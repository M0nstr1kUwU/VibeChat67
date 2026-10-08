<script setup lang="ts">
import {computed, onMounted, ref} from "vue";
import {BaseDirectory, exists, mkdir, readTextFile, writeTextFile} from "@tauri-apps/plugin-fs";
import {open} from "@tauri-apps/plugin-dialog";
import {convertFileSrc} from "@tauri-apps/api/core";
import builtInThemes from "../data/themes.json";
import type {UserAccount} from "../types/user";
import {updateUserProfile} from "../services/userStorage";
import {applyTheme, loadAllThemes} from "../services/themeStorage";
import type {Theme, ThemeRule} from "../services/themeStorage";

const props = defineProps<{
  user: UserAccount;
}>();

const emit = defineEmits<{
  "profile-updated": [
    user: UserAccount
  ];
  logout: [];
}>();
const SETTINGS_FILE = "settings.json";
const THEMES_DIRECTORY = "themes";
const profileNickname = ref("");
const profileMessage = ref("");
const profileError = ref("");
const profileSaving = ref(false);

const avatarUrl = computed(() => {
      if (!props.user.avatarPath) {
        return "";
      }

      return convertFileSrc(props.user.avatarPath, "asset");
    });

const avatarInitials =
    computed(() => {
      const name = profileNickname.value.trim();
      if (!name) {
        return "?";
      }
      const parts = name.split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();});

const customThemes = ref<Theme[]>([]);
const selectedThemeId = ref("dark");
const themeName = ref("");
const themeSelector = ref("");
const themeProperty = ref("");
const themeValue = ref("");
const editorRules = ref<ThemeRule[]>([]);

const allThemes = computed<Theme[]>(() => {
      return [
        ...(builtInThemes as Theme[]),
        ...customThemes.value,
      ];
    });

const selectedTheme = computed(() => {
      return (allThemes.value.find(theme => theme.id === selectedThemeId.value) ?? null);
    });
async function ensureDirectories() {
  await mkdir(THEMES_DIRECTORY,
      {baseDir: BaseDirectory.AppData, recursive: true,}
  );
}

async function saveSettings() {
  const settings = {themeId: selectedThemeId.value,};
  await writeTextFile(SETTINGS_FILE,
      JSON.stringify(settings, null, 2),
      {baseDir: BaseDirectory.AppData,}
  );
}

async function loadSettings() {
  const settingsExists = await exists(SETTINGS_FILE,
          {baseDir: BaseDirectory.AppData,}
      );

  if (!settingsExists) {
    selectedThemeId.value = "dark";
    return;
  }

  try {
    const text = await readTextFile(SETTINGS_FILE,
        {baseDir: BaseDirectory.AppData}
    );
    const data = JSON.parse(text) as { themeId?: string; };
    if (typeof data.themeId === "string" && data.themeId.length > 0) {
      selectedThemeId.value = data.themeId;
    } else {
      selectedThemeId.value = "dark";
    }
  } catch (error) {
    console.error("Ошибка загрузки настроек:", error);
    selectedThemeId.value = "dark";
  }
}

async function loadCustomThemes() {
  try {
    const themes = await loadAllThemes();
    customThemes.value = themes.filter(theme => !(builtInThemes as Theme[]).some(builtIn => builtIn.id === theme.id));
  } catch (error) {
    console.error("Ошибка загрузки кастомных тем:", error);
    customThemes.value = [];
  }
}

async function selectTheme(theme: Theme) {
  selectedThemeId.value = theme.id;
  applyTheme(theme);
  try {
    await saveSettings();
  } catch (error) {
    console.error("Ошибка сохранения выбранной темы:", error);
  }
}

function addRule() {
  const selector = themeSelector.value.trim();
  const property = themeProperty.value.trim();
  const value = themeValue.value.trim();
  if (!selector || !property || !value) {
    return;
  }
  let rule = editorRules.value.find(item => item.selector === selector);
  if (!rule) {
    rule = {selector, properties: {}};
    editorRules.value.push(rule);
  }
  rule.properties[property] = value;
  themeProperty.value = "";
  themeValue.value = "";
}

function removeRuleProperty(rule: ThemeRule, property: string) {
  delete rule.properties[property];

  if (Object.keys(rule.properties).length === 0
  ) {
    const index = editorRules.value.indexOf(rule);
    if (index !== -1) {
      editorRules.value.splice(index, 1);
    }
  }
}

async function createCustomTheme() {
  const name = themeName.value.trim();
  if (!name || editorRules.value.length === 0) { return; }
  const id = name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9а-яё_-]/gi, "");
  if (!id) {
    return;
  }

  const theme: Theme = {id, name, rules: JSON.parse(JSON.stringify(editorRules.value)),};
  const path = `${THEMES_DIRECTORY}/${id}.json`;
  try {
    await writeTextFile(path, JSON.stringify(theme, null, 2), {baseDir: BaseDirectory.AppData,});
    customThemes.value = customThemes.value.filter(item => item.id !== theme.id);
    customThemes.value.push(theme);
    themeName.value = "";
    themeSelector.value = "";
    themeProperty.value = "";
    themeValue.value = "";
    editorRules.value = [];
    await selectTheme(theme);
  } catch (error) {
    console.error("Ошибка сохранения кастомной темы:", error);
  }
}
async function saveProfile() {
  profileError.value = "";
  profileMessage.value = "";
  const nickname = profileNickname.value.trim();

  if (!nickname) {
    profileError.value = "Введите никнейм.";
    return;
  }

  if (nickname.length > 32) {
    profileError.value = "Никнейм не должен быть длиннее 32 символов.";
    return;
  }
  profileSaving.value = true;
  try {
    const updated = await updateUserProfile(props.user.id, {nickname,});
    emit("profile-updated", updated);
    profileMessage.value = "Профиль сохранён.";
  } catch (error) {
    console.error("Ошибка сохранения профиля:", error);
    profileError.value = error instanceof Error ? error.message : "Ошибка сохранения профиля.";
  } finally {
    profileSaving.value = false;
  }
}

async function selectAvatar() {
  profileError.value = "";
  profileMessage.value = "";

  try {
    const selected = await open({
          multiple: false,
          directory: false,
          filters: [
            {
              name: "Изображения",
              extensions: [
                "png",
                "jpg",
                "jpeg",
                "gif",
                "webp",
                "bmp",
              ],
            },
          ],
        });

    if (!selected || Array.isArray(selected)) {
      return;
    }

    const updated = await updateUserProfile(props.user.id, {avatarPath: selected,});
    emit("profile-updated", updated);
    profileMessage.value = "Аватар изменён.";
  } catch (error) {
    console.error("Ошибка выбора аватара:", error);
    profileError.value = "Не удалось установить аватар.";
  }
}

async function removeAvatar() {
  profileError.value = "";
  profileMessage.value = "";

  try {
    const updated = await updateUserProfile(props.user.id, {avatarPath: "",});
    emit("profile-updated", updated);
    profileMessage.value = "Аватар удалён.";
  } catch (error) {
    console.error("Ошибка удаления аватара:", error);
    profileError.value = "Не удалось удалить аватар.";
  }
}

onMounted(async () => {
  profileNickname.value = props.user.nickname;
  await ensureDirectories();
  await loadSettings();
  await loadCustomThemes();
  const theme = allThemes.value.find(item => item.id === selectedThemeId.value);
  if (theme) {
    applyTheme(theme);
    return;
  }
  const fallback = allThemes.value.find(item => item.id === "dark");
  if (fallback) {
    selectedThemeId.value = fallback.id;
    applyTheme(fallback);
    try {
      await saveSettings();
    } catch (error) {
      console.error("Ошибка сохранения fallback-темы:", error);
    }
  }
});
</script>

<template>
  <section class="settings">
    <div class="settings-header">
      <h1>Настройки</h1>
    </div>
    <div class="settings-section">
      <h2>Профиль</h2>
      <div class="profile-editor">
        <div class="profile-preview">
          <div class="profile-avatar-large">
            <img
                v-if="avatarUrl"
                :src="avatarUrl"
                :alt="user.nickname"
                @error="console.error('Ошибка отображения аватара:', user.avatarPath)"
            />
            <span v-else>{{ avatarInitials }}</span>
          </div>

          <div class="profile-preview-text">
            <strong>{{ profileNickname }}</strong>
            <span>@{{ user.login }}</span>
          </div>
        </div>

        <div class="profile-actions">
          <button
              type="button"
              class="settings-button"
              @click="selectAvatar"
          >Изменить аватар</button>

          <button
              v-if="user.avatarPath"
              type="button"
              class="settings-button danger"
              @click="removeAvatar"
          >Удалить аватар</button>
        </div>

        <label class="profile-label">Никнейм<input
              v-model="profileNickname"
              type="text"
              maxlength="32"
              placeholder="Ваш никнейм"
          />
        </label>
        <div v-if="profileError" class="profile-error">{{ profileError }}</div>
        <div v-if="profileMessage" class="profile-success">{{ profileMessage }}</div>
        <button
            type="button"
            class="settings-button primary"
            :disabled="profileSaving"
            @click="saveProfile"
        >
          {{
            profileSaving
                ? "Сохранение..."
                : "Сохранить профиль"
          }}
        </button>
        <div class="account-info">
          <span>Логин</span>
          <strong>@{{ user.login }}</strong>
        </div>
        <button
            type="button"
            class="logout-button"
            @click="emit('logout')"
        >Выйти из аккаунта</button>
      </div>
    </div>
    <div class="settings-section">
      <h2>Темы</h2>
      <div class="theme-grid">
        <button
            v-for="theme in allThemes"
            :key="theme.id"
            type="button"
            class="theme-card"
            :class="{ active: selectedThemeId === theme.id }"
            @click="selectTheme(theme)"
        >
          <span class="theme-card-name">{{ theme.name }}</span>
          <span class="theme-card-id">{{ theme.id }}</span>
          <span v-if="customThemes.some(item => item.id === theme.id)" class="theme-card-type">Кастомная</span>
        </button>
      </div>
    </div>
    <div class="settings-section">
      <h2>Создать кастомную тему</h2>
      <div class="theme-editor">
        <label>Название темы<input
              v-model="themeName"
              type="text"
              placeholder="My Theme"
          />
        </label>
        <div class="rule-editor">
          <label>Селектор<input
                v-model="themeSelector"
                type="text"
                placeholder=".message"
            />
          </label>
          <label>CSS-свойство<input
                v-model="themeProperty"
                type="text"
                placeholder="background"
            />
          </label>

          <label>Значение<input
                v-model="themeValue"
                type="text"
                placeholder="#ff0000"
            />
          </label>
          <button
              type="button"
              class="settings-button"
              @click="addRule"
          >Добавить</button>
        </div>
        <div v-if="editorRules.length" class="rules-list">
          <div v-for="rule in editorRules" :key="rule.selector" class="rule">
            <div class="rule-header">
              <strong>{{ rule.selector }}</strong>
            </div>
            <div
                v-for="(
                value,
                property
              ) in rule.properties" :key="property" class="rule-property"
            >
              <span>{{ property }}:{{ value }}</span>
              <button
                  type="button"
                  @click="removeRuleProperty(rule, property)"
              >×</button>
            </div>
          </div>
        </div>
        <button
            type="button"
            class="settings-button primary"
            @click="createCustomTheme"
        >Создать тему</button>
      </div>
    </div>
    <div class="settings-section">
      <h2>Текущая тема</h2>
      <div v-if="selectedTheme" class="current-theme">
        <strong>{{ selectedTheme.name }}</strong>
        <span>{{ selectedTheme.id }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.settings {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #111318;
  color: #f2f3f5;
}

.settings-header {
  margin-bottom: 28px;
}

.settings-header h1 {
  margin: 0 0 6px;
  font-size: 24px;
}

.settings-section {
  margin-bottom: 28px;
  padding: 20px;
  border: 1px solid #252830;
  border-radius: 10px;
  background: #17191f;
}

.settings-section h2 {
  margin: 0 0 16px;
  font-size: 16px;
}

.profile-editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.profile-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-avatar-large {
  width: 68px;
  height: 68px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: #384b82;
  color: #ffffff;

  font-size: 18px;
  font-weight: 700;
  user-select: none;
}

.profile-avatar-large img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.profile-preview-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-preview-text strong {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
}

.profile-preview-text span {
  color: #858c98;
  font-size: 12px;
}

.profile-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.profile-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #9aa2af;
  font-size: 12px;
}

.profile-label input {
  width: 100%;
  height: 40px;
  padding: 0 10px;
  border: 1px solid #30343d;
  border-radius: 6px;
  outline: none;
  background: #111318;
  color: #f2f3f5;
  font: inherit;
}

.profile-label input:focus {
  border-color: #5978ba;
}

.profile-error,
.profile-success {
  font-size: 12px;
}

.profile-error {
  color: #ff8383;
}

.profile-success {
  color: #8ed49a;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 4px;
}

.account-info span {
  color: #858c98;
  font-size: 11px;
}

.account-info strong {
  font-size: 13px;
}

.logout-button {
  align-self: flex-start;
  height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(212, 92, 92, 0.45);
  border-radius: 6px;
  background: rgba(212, 92, 92, 0.08);
  color: #ff8989;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}

.logout-button:hover {
  background: rgba(212, 92, 92, 0.14);
}

.theme-grid {
  display: grid;
  grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.theme-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  min-height: 82px;
  padding: 14px;
  border: 1px solid #30343d;
  border-radius: 8px;
  background: #20232a;
  color: #f2f3f5;
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.theme-card:hover {
  background: #282c34;
}

.theme-card.active {
  border-color: #5978ba;
  background: #303b59;
}

.theme-card-name {
  font-size: 14px;
  font-weight: 600;
}

.theme-card-id {
  color: #9aa2af;
  font-size: 11px;
}

.theme-card-type {
  color: #b9c9ef;
  font-size: 10px;
}

.theme-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.theme-editor label,
.rule-editor label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #9aa2af;
  font-size: 12px;
}

.theme-editor input,
.rule-editor input {
  height: 38px;
  padding: 0 10px;
  border: 1px solid #30343d;
  border-radius: 6px;
  outline: none;
  background: #111318;
  color: #f2f3f5;
  font: inherit;
}

.theme-editor input:focus,
.rule-editor input:focus {
  border-color: #5978ba;
}

.rule-editor {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr auto;
  gap: 10px;
  align-items: end;
}

.settings-button {
  height: 38px;
  padding: 0 14px;
  border: 1px solid #30343d;
  border-radius: 6px;
  background: #20232a;
  color: #f2f3f5;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}

.settings-button:hover:not(:disabled) {
  background: #2a2e37;
}

.settings-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.settings-button.primary {
  align-self: flex-start;
  border-color: #315bb5;
  background: #315bb5;
  color: #ffffff;
}

.settings-button.primary:hover:not(:disabled) {
  background: #3b69ca;
}

.settings-button.danger {
  border-color: rgba(212, 92, 92, 0.45);
  background: rgba(212, 92, 92, 0.08);
  color: #ff8989;
}

.settings-button.danger:hover {
  background: rgba(212, 92, 92, 0.14);
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rule {
  padding: 12px;
  border: 1px solid #30343d;
  border-radius: 7px;
  background: #111318;
}

.rule-header {
  margin-bottom: 8px;
  color: #ffffff;
  font-size: 12px;
}

.rule-property {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 0;
  color: #aeb5c0;
  font-family: monospace;
  font-size: 11px;
}

.rule-property button {
  border: 0;
  background: transparent;
  color: #ff7d7d;
  cursor: pointer;
  font-size: 16px;
}

.current-theme {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}

.current-theme strong {
  font-size: 14px;
}

.current-theme span {
  color: #858c98;
  font-family: monospace;
  font-size: 12px;
}
@media (max-width: 800px) {
  .rule-editor {
    grid-template-columns: 1fr;
  }
  .settings {
    padding: 16px;
  }
  .settings-section {
    padding: 16px;
  }
}
</style>