import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidPersonName(value: string): boolean {
  const normalized = value.trim();

  if (!normalized || normalized.length < 2 || normalized.length > 120) {
    return false;
  }

  const blocked = [
    "test",
    "teste",
    "bot",
    "usuario",
    "cliente",
    "anônimo",
    "anonimo",
    "user",
    "admin",
    "visitante",
    "aaa",
    "bbb",
    "ccc",
    "abc",
    "qwerty",
    "asdf",
    "asdfg",
    "lorem",
    "ipsum",
    "null",
    "undefined",
  ];

  if (blocked.includes(normalized.toLowerCase())) {
    return false;
  }

  if (/\d/.test(normalized)) {
    return false;
  }

  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(normalized)) {
    return false;
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.some((token) => token.length < 2)) {
    return false;
  }

  if (/[^A-Za-zÀ-ÖØ-öø-ÿ\s'’-]/.test(normalized)) {
    return false;
  }

  return true;
}
