import { NextRequest } from 'next/server';

export function createJsonRequest(url: string, options?: {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}) {
  return new NextRequest(url, {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}
