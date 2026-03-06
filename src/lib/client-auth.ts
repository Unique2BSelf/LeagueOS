"use client";

export interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  photoUrl?: string | null;
  [key: string]: unknown;
}

const STORAGE_KEY = 'league_user';

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export async function syncStoredUser(): Promise<StoredUser | null> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      clearStoredUser();
      return null;
    }

    const user = (await response.json()) as StoredUser;
    setStoredUser(user);
    return user;
  } catch {
    return getStoredUser();
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    clearStoredUser();
  }
}

export function getAuthHeaders(init?: HeadersInit): HeadersInit {
  return init || {};
}
