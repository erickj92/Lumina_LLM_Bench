import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Simple encryption/obfuscation for local storage.
 * This is NOT cryptographically secure — it's meant to prevent
 * casual shoulder-surfing, not determined attackers.
 * Keys are stored in localStorage, which is accessible to any
 * JS running on the same origin.
 */
const STORAGE_PREFIX = 'lmb_';
const KEY_PREFIX = 'lmk_';

export function encryptKey(raw: string): string {
  return KEY_PREFIX + btoa(raw);
}

export function decryptKey(encoded: string): string {
  if (!encoded.startsWith(KEY_PREFIX)) return encoded;
  return atob(encoded.slice(KEY_PREFIX.length));
}

export function storageKey(key: string): string {
  return STORAGE_PREFIX + key;
}