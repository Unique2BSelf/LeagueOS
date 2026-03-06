import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

const buildSessionResponseMock = vi.fn(async (user: unknown, init?: ResponseInit) => NextResponse.json(user, init));
const hashPasswordMock = vi.fn(async (value: string) => `hashed:${value}`);

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({
  buildSessionResponse: buildSessionResponseMock,
  toPublicUser: (user: any) => user,
}));
vi.mock('@/lib/password', () => ({ hashPassword: hashPasswordMock }));

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects duplicate emails', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'existing-user' });

    const { POST } = await import('@/app/api/auth/register/route');
    const response = await POST(createJsonRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Existing Player',
        email: 'player@example.com',
        password: 'Password123!',
        photoUrl: 'https://example.com/photo.jpg',
      },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Email already registered' });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('always creates public registrations as PLAYER even if a privileged role is supplied', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValueOnce({
      id: 'user-1',
      fullName: 'New Player',
      email: 'new@example.com',
      role: 'PLAYER',
      photoUrl: 'https://example.com/photo.jpg',
    });

    const { POST } = await import('@/app/api/auth/register/route');
    const response = await POST(createJsonRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'New Player',
        email: 'new@example.com',
        password: 'Password123!',
        role: 'ADMIN',
        photoUrl: 'https://example.com/photo.jpg',
      },
    }));

    expect(response.status).toBe(201);
    expect(hashPasswordMock).toHaveBeenCalledWith('Password123!');
    expect(prismaMock.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'new@example.com',
        role: 'PLAYER',
      }),
    }));
    expect(buildSessionResponseMock).toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ role: 'PLAYER' }));
  });
});
