export interface UserAccount {
    id: number;
    login: string;
    nickname: string;
    passwordHash: string;
    passwordSalt: string;
    avatarPath?: string;
    createdAt: string;
}

export interface SessionData {
    userId: number | null;
}

export interface UserProfileUpdate {
    nickname?: string;
    avatarPath?: string;
}