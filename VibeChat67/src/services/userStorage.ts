import {
    BaseDirectory,
    exists,
    readTextFile,
    writeTextFile,
} from "@tauri-apps/plugin-fs";

import type {
    SessionData,
    UserAccount,
    UserProfileUpdate,
} from "../types/user";

const USERS_FILE = "users.json";
const SESSION_FILE = "session.json";

const PBKDF2_ITERATIONS = 120000;

function normalizeLogin(login: string): string {
    return login.trim().toLowerCase();
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

async function hashPassword(
    password: string,
    salt: Uint8Array
): Promise<string> {
    const passwordBytes = new TextEncoder().encode(password);

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        passwordBytes,
        {
            name: "PBKDF2",
        },
        false,
        ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256",
        },
        keyMaterial,
        256
    );

    return bytesToBase64(new Uint8Array(derivedBits));
}

async function readUsersFile(): Promise<UserAccount[]> {
    const fileExists = await exists(
        USERS_FILE,
        {
            baseDir: BaseDirectory.AppData,
        }
    );

    if (!fileExists) {
        return [];
    }

    try {
        const text = await readTextFile(
            USERS_FILE,
            {
                baseDir: BaseDirectory.AppData,
            }
        );

        const data = JSON.parse(text);

        if (!Array.isArray(data)) {
            return [];
        }

        return data as UserAccount[];
    } catch (error) {
        console.error(
            "Ошибка чтения users.json:",
            error
        );

        return [];
    }
}

async function writeUsersFile(
    users: UserAccount[]
): Promise<void> {
    await writeTextFile(
        USERS_FILE,
        JSON.stringify(users, null, 2),
        {
            baseDir: BaseDirectory.AppData,
        }
    );
}

export async function loadUsers(): Promise<UserAccount[]> {
    return readUsersFile();
}

export async function saveUsers(
    users: UserAccount[]
): Promise<void> {
    await writeUsersFile(users);
}

export async function registerUser(
    loginInput: string,
    nicknameInput: string,
    password: string
): Promise<UserAccount> {
    const login = normalizeLogin(loginInput);
    const nickname = nicknameInput.trim();

    if (login.length < 3) {
        throw new Error(
            "Логин должен содержать минимум 3 символа."
        );
    }

    if (login.length > 32) {
        throw new Error(
            "Логин не должен быть длиннее 32 символов."
        );
    }

    if (!/^[a-z0-9_.-]+$/.test(login)) {
        throw new Error(
            "Логин может содержать только латинские буквы, цифры, _, -, ."
        );
    }

    if (!nickname) {
        throw new Error(
            "Введите никнейм."
        );
    }

    if (nickname.length > 32) {
        throw new Error(
            "Никнейм не должен быть длиннее 32 символов."
        );
    }

    if (password.length < 6) {
        throw new Error(
            "Пароль должен содержать минимум 6 символов."
        );
    }

    const users = await readUsersFile();

    const loginAlreadyExists = users.some(
        user => user.login === login
    );

    if (loginAlreadyExists) {
        throw new Error(
            "Пользователь с таким логином уже существует."
        );
    }

    const maxId = users.reduce(
        (max, user) =>
            Math.max(max, user.id),
        0
    );

    const id = maxId + 1;

    const salt = crypto.getRandomValues(
        new Uint8Array(16)
    );

    const passwordHash = await hashPassword(
        password,
        salt
    );

    const user: UserAccount = {
        id,
        login,
        nickname,
        passwordHash,
        passwordSalt: bytesToBase64(salt),
        createdAt: new Date().toISOString(),
    };

    users.push(user);

    await writeUsersFile(users);

    await saveSession(user.id);

    return user;
}

export async function loginUser(
    loginInput: string,
    password: string
): Promise<UserAccount> {
    const login = normalizeLogin(loginInput);

    const users = await readUsersFile();

    const user = users.find(
        item => item.login === login
    );

    if (!user) {
        throw new Error(
            "Неверный логин или пароль."
        );
    }

    const salt = base64ToBytes(
        user.passwordSalt
    );

    const passwordHash = await hashPassword(
        password,
        salt
    );

    if (passwordHash !== user.passwordHash) {
        throw new Error(
            "Неверный логин или пароль."
        );
    }

    await saveSession(user.id);

    return user;
}

export async function saveSession(
    userId: number | null
): Promise<void> {
    const session: SessionData = {
        userId,
    };

    await writeTextFile(
        SESSION_FILE,
        JSON.stringify(session, null, 2),
        {
            baseDir: BaseDirectory.AppData,
        }
    );
}

export async function restoreSession(
    users: UserAccount[]
): Promise<UserAccount | null> {
    const fileExists = await exists(
        SESSION_FILE,
        {
            baseDir: BaseDirectory.AppData,
        }
    );

    if (!fileExists) {
        return null;
    }

    try {
        const text = await readTextFile(
            SESSION_FILE,
            {
                baseDir: BaseDirectory.AppData,
            }
        );

        const session =
            JSON.parse(text) as SessionData;

        if (
            typeof session.userId !== "number"
        ) {
            return null;
        }

        return (
            users.find(
                user => user.id === session.userId
            ) ?? null
        );
    } catch (error) {
        console.error(
            "Ошибка восстановления сессии:",
            error
        );

        return null;
    }
}

export async function logoutUser(): Promise<void> {
    await saveSession(null);
}

export async function updateUserProfile(
    userId: number,
    update: UserProfileUpdate
): Promise<UserAccount> {
    const users = await readUsersFile();

    const index = users.findIndex(
        user => user.id === userId
    );

    if (index === -1) {
        throw new Error(
            "Пользователь не найден."
        );
    }

    const currentUser = users[index];

    if (
        update.nickname !== undefined
    ) {
        const nickname =
            update.nickname.trim();

        if (!nickname) {
            throw new Error(
                "Никнейм не может быть пустым."
            );
        }

        if (nickname.length > 32) {
            throw new Error(
                "Никнейм не должен быть длиннее 32 символов."
            );
        }

        currentUser.nickname = nickname;
    }

    if (
        update.avatarPath !== undefined
    ) {
        currentUser.avatarPath =
            update.avatarPath || undefined;
    }

    users[index] = currentUser;

    await writeUsersFile(users);

    return currentUser;
}