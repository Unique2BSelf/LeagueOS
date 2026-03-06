import bcrypt from 'bcryptjs';

function legacySimpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash &= hash;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, storedPassword: string): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (storedPassword.startsWith('$2')) {
    return {
      valid: await bcrypt.compare(password, storedPassword),
      needsUpgrade: false,
    };
  }

  const valid = legacySimpleHash(password) === storedPassword;
  return { valid, needsUpgrade: valid };
}
