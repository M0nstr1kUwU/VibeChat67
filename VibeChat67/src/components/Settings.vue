<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readTextFile,
  writeTextFile
} from "@tauri-apps/plugin-fs";
import builtInThemes from "../data/themes.json";

interface ThemeRule {
  selector: string;
  properties: Record<string, string>;
}

interface Theme {
  id: string;
  name: string;
  rules: ThemeRule[];
}

interface SettingsData {
  themeId: string;
}

const SETTINGS_FILE = "settings.json";
const THEMES_DIRECTORY = "themes";

const customThemes = ref<Theme[]>([]);
const selectedThemeId = ref("dark");

const themeName = ref("");
const themeSelector = ref("");
const themeProperty = ref("");
const themeValue = ref("");

const editorRules = ref<ThemeRule[]>([]);

const allThemes = computed<Theme[]>(() => [
  ...(builtInThemes as Theme[]),
  ...customThemes.value
]);

const selectedTheme = computed(() =>
    allThemes.value.find(
        theme => theme.id === selectedThemeId.value
    ) ?? null
);

async function ensureDirectories() {
  await mkdir(THEMES_DIRECTORY, {
    baseDir: BaseDirectory.AppData,
    recursive: true
  });
}

async function saveSettings() {
  const settings: SettingsData = {
    themeId: selectedThemeId.value
  };

  await writeTextFile(
      SETTINGS_FILE,
      JSON.stringify(settings, null, 2),
      {
        baseDir: BaseDirectory.AppData
      }
  );
}

async function loadSettings() {
  const settingsExists = await exists(
      SETTINGS_FILE,
      {
        baseDir: BaseDirectory.AppData
      }
  );

  if (!settingsExists) {
    selectedThemeId.value = "dark";
    return;
  }

  try {
    const text = await readTextFile(
        SETTINGS_FILE,
        {
          baseDir: BaseDirectory.AppData
        }
    );

    const data = JSON.parse(text) as SettingsData;

    if (
        typeof data.themeId === "string" &&
        data.themeId.length > 0
    ) {
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
  customThemes.value = [];

  try {
    const entries = await readDir(
        THEMES_DIRECTORY,
        {
          baseDir: BaseDirectory.AppData
        }
    );

    for (const entry of entries) {
      if (!entry.name || !entry.name.endsWith(".json")) {
        continue;
      }

      try {
        const path = `${THEMES_DIRECTORY}/${entry.name}`;

        const text = await readTextFile(
            path,
            {
              baseDir: BaseDirectory.AppData
            }
        );

        const theme = JSON.parse(text) as Theme;

        if (
            typeof theme.id !== "string" ||
            typeof theme.name !== "string" ||
            !Array.isArray(theme.rules)
        ) {
          continue;
        }

        customThemes.value.push(theme);
      } catch (error) {
        console.error(
            `Ошибка чтения темы ${entry.name}:`,
            error
        );
      }
    }
  } catch (error) {
    console.error(
        "Ошибка загрузки кастомных тем:",
        error
    );
  }
}

function applyTheme(theme: Theme) {
  const oldStyle = document.getElementById(
      "vibechat-theme"
  );

  if (oldStyle) {
    oldStyle.remove();
  }

  const style = document.createElement("style");
  style.id = "vibechat-theme";

  style.textContent = theme.rules
      .map(rule => {
        const properties = Object.entries(
            rule.properties
        )
            .map(
                ([property, value]) =>
                    `${property}: ${value};`
            )
            .join(" ");

        return `${rule.selector} { ${properties} }`;
      })
      .join("\n");

  document.head.appendChild(style);
}

async function selectTheme(theme: Theme) {
  selectedThemeId.value = theme.id;

  applyTheme(theme);

  try {
    await saveSettings();
  } catch (error) {
    console.error(
        "Ошибка сохранения выбранной темы:",
        error
    );
  }
}

function addRule() {
  const selector = themeSelector.value.trim();
  const property = themeProperty.value.trim();
  const value = themeValue.value.trim();

  if (!selector || !property || !value) {
    return;
  }

  let rule = editorRules.value.find(
      item => item.selector === selector
  );

  if (!rule) {
    rule = {
      selector,
      properties: {}
    };

    editorRules.value.push(rule);
  }

  rule.properties[property] = value;

  themeProperty.value = "";
  themeValue.value = "";
}

function removeRuleProperty(
    rule: ThemeRule,
    property: string
) {
  delete rule.properties[property];

  if (
      Object.keys(rule.properties).length === 0
  ) {
    const index =
        editorRules.value.indexOf(rule);

    if (index !== -1) {
      editorRules.value.splice(index, 1);
    }
  }
}

async function createCustomTheme() {
  const name = themeName.value.trim();

  if (
      !name ||
      editorRules.value.length === 0
  ) {
    return;
  }

  const id = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9а-яё_-]/gi, "");

  if (!id) {
    return;
  }

  const theme: Theme = {
    id,
    name,
    rules: JSON.parse(
        JSON.stringify(editorRules.value)
    )
  };

  const path =
      `${THEMES_DIRECTORY}/${id}.json`;

  try {
    await writeTextFile(
        path,
        JSON.stringify(theme, null, 2),
        {
          baseDir: BaseDirectory.AppData
        }
    );

    customThemes.value =
        customThemes.value.filter(
            item => item.id !== theme.id
        );

    customThemes.value.push(theme);

    themeName.value = "";
    themeSelector.value = "";
    themeProperty.value = "";
    themeValue.value = "";
    editorRules.value = [];

    await selectTheme(theme);
  } catch (error) {
    console.error(
        "Ошибка сохранения кастомной темы:",
        error
    );
  }
}

onMounted(async () => {
  await ensureDirectories();

  await loadCustomThemes();
  await loadSettings();

  const theme = allThemes.value.find(
      item => item.id === selectedThemeId.value
  );

  if (theme) {
    applyTheme(theme);
    return;
  }

  const fallback = allThemes.value.find(
      item => item.id === "dark"
  );

  if (fallback) {
    selectedThemeId.value = fallback.id;
    applyTheme(fallback);
    await saveSettings();
  }
});
</script>

<template>
  <section class="settings">
    <div class="settings-header">
      <h1>Настройки</h1>
    </div>
    <div class="settings-section">
      <h2>Темы</h2>
      <div class="theme-grid">
        <button
            v-for="theme in allThemes"
            :key="theme.id"
            type="button"
            class="theme-card"
            :class="{
            active:
              selectedThemeId === theme.id
          }"
            @click="selectTheme(theme)"
        >
          <span class="theme-card-name">
            {{ theme.name }}
          </span>

          <span class="theme-card-id">
            {{ theme.id }}
          </span>

          <span
              v-if="
              customThemes.some(
                item => item.id === theme.id
              )
            "
              class="theme-card-type"
          >
            Кастомная
          </span>
        </button>
      </div>
    </div>

    <div class="settings-section">
      <h2>Создать кастомную тему</h2>

      <div class="theme-editor">
        <label>
          Название темы
          <input
              v-model="themeName"
              type="text"
              placeholder="My Theme"
          />
        </label>

        <div class="rule-editor">
          <label>
            Селектор
            <input
                v-model="themeSelector"
                type="text"
                placeholder=".message"
            />
          </label>

          <label>
            CSS-свойство
            <input
                v-model="themeProperty"
                type="text"
                placeholder="background"
            />
          </label>

          <label>
            Значение
            <input
                v-model="themeValue"
                type="text"
                placeholder="#ff0000"
            />
          </label>

          <button
              type="button"
              class="settings-button"
              @click="addRule"
          >
            Добавить
          </button>
        </div>

        <div
            v-if="editorRules.length"
            class="rules-list"
        >
          <div
              v-for="rule in editorRules"
              :key="rule.selector"
              class="rule"
          >
            <div class="rule-header">
              <strong>
                {{ rule.selector }}
              </strong>
            </div>

            <div
                v-for="(
                value,
                property
              ) in rule.properties"
                :key="property"
                class="rule-property"
            >
              <span>
                {{ property }}: {{ value }}
              </span>

              <button
                  type="button"
                  @click="
                  removeRuleProperty(
                    rule,
                    property
                  )
                "
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <button
            type="button"
            class="settings-button primary"
            @click="createCustomTheme"
        >
          Создать тему
        </button>
      </div>
    </div>

    <div class="settings-section">
      <h2>Текущая тема</h2>

      <div
          v-if="selectedTheme"
          class="current-theme"
      >
        <strong>
          {{ selectedTheme.name }}
        </strong>

        <span>
          {{ selectedTheme.id }}
        </span>
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

.settings-header p {
  margin: 0;
  color: #858c98;
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

.theme-grid {
  display: grid;
  grid-template-columns:
    repeat(
      auto-fill,
      minmax(180px, 1fr)
    );
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
  font-size: 11px;
  color: #9aa2af;
}

.theme-card-type {
  font-size: 10px;
  color: #b9c9ef;
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
  font-size: 12px;
  color: #9aa2af;
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
  grid-template-columns:
    1.2fr 1fr 1fr auto;
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
}

.settings-button:hover {
  background: #2a2e37;
}

.settings-button.primary {
  align-self: flex-start;
  background: #315bb5;
  border-color: #315bb5;
  color: #ffffff;
}

.settings-button.primary:hover {
  background: #3b69ca;
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

.current-theme span {
  color: #858c98;
  font-family: monospace;
  font-size: 12px;
}

.settings-path {
  margin-top: 8px;
  color: #858c98;
  font-size: 11px;
}

.settings-path code {
  color: #b9c9ef;
}

@media (max-width: 800px) {
  .rule-editor {
    grid-template-columns: 1fr;
  }
}
</style>