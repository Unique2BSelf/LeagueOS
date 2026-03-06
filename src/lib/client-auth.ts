"use client";

export interface StoredUser {
  id: string;
  fullName?: string;
  email?: string;
  role?: string;
  photoUrl?: string | null;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem("league_user");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function getAuthHeaders(init?: HeadersInit): HeadersInit {
  const user = getStoredUser();

  return {
    ...(init || {}),
    ...(user?.id ? { "x-user-id": user.id } : {}),
  };
}

