export interface Message {
    id: number;
    author: string;
    user_id: number;    
    body: string;
    createdAt?: string;
}

export interface User {
    id: number;
    name: string;
}