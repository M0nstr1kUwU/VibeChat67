import {
    BaseDirectory,
    exists,
    readDir,
    readTextFile,
} from "@tauri-apps/plugin-fs";

import builtInThemes from "../data/themes.json";

export interface ThemeRule {
    selector: string;
    properties: Record<string, string>;
}

export interface Theme {
    id: string;
    name: string;
    rules: ThemeRule[];
}

interface SettingsData {
    themeId: string;
}

const SETTINGS_FILE = "settings.json";
const THEMES_DIRECTORY = "themes";

export async function loadAllThemes(): Promise<Theme[]> {
    const themes: Theme[] = [
        ...(builtInThemes as Theme[]),
    ];

    try {
        const directoryExists =
            await exists(
                THEMES_DIRECTORY,
                {
                    baseDir:
                    BaseDirectory.AppData,
                }
            );

        if (!directoryExists) {
            return themes;
        }

        const entries =
            await readDir(
                THEMES_DIRECTORY,
                {
                    baseDir:
                    BaseDirectory.AppData,
                }
            );

        for (const entry of entries) {
            if (
                !entry.name ||
                !entry.name.endsWith(".json")
            ) {
                continue;
            }

            try {
                const path =
                    `${THEMES_DIRECTORY}/${entry.name}`;

                const text =
                    await readTextFile(
                        path,
                        {
                            baseDir:
                            BaseDirectory.AppData,
                        }
                    );

                const theme =
                    JSON.parse(text) as Theme;

                if (
                    typeof theme.id !== "string" ||
                    typeof theme.name !== "string" ||
                    !Array.isArray(theme.rules)
                ) {
                    continue;
                }

                themes.push(theme);
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

    return themes;
}

export function applyTheme(
    theme: Theme
) {
    const oldStyle =
        document.getElementById(
            "vibechat-theme"
        );

    if (oldStyle) {
        oldStyle.remove();
    }

    const style =
        document.createElement("style");

    style.id =
        "vibechat-theme";

    style.textContent =
        theme.rules
            .map(rule => {
                const properties =
                    Object.entries(
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

export async function loadSavedTheme(): Promise<Theme | null> {
    const themes =
        await loadAllThemes();

    let selectedThemeId = "dark";

    const settingsExists =
        await exists(
            SETTINGS_FILE,
            {
                baseDir:
                BaseDirectory.AppData,
            }
        );

    if (settingsExists) {
        try {
            const text =
                await readTextFile(
                    SETTINGS_FILE,
                    {
                        baseDir:
                        BaseDirectory.AppData,
                    }
                );

            const data =
                JSON.parse(
                    text
                ) as SettingsData;

            if (
                typeof data.themeId ===
                "string" &&
                data.themeId.length > 0
            ) {
                selectedThemeId =
                    data.themeId;
            }
        } catch (error) {
            console.error(
                "Ошибка чтения выбранной темы:",
                error
            );
        }
    }

    const selectedTheme =
        themes.find(
            theme =>
                theme.id ===
                selectedThemeId
        );

    if (selectedTheme) {
        return selectedTheme;
    }

    return (
        themes.find(
            theme =>
                theme.id === "dark"
        ) ?? null
    );
}

export async function loadAndApplySavedTheme() {
    const theme =
        await loadSavedTheme();

    if (!theme) {
        return;
    }

    applyTheme(theme);

    return theme;
}