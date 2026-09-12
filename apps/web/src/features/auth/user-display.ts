import type { User } from 'firebase/auth';

export function getUserDisplayName(user: User | null) {
  const displayName = user?.displayName?.trim();

  if (displayName) return displayName;

  const emailName = user?.email?.split('@')[0]?.trim();

  if (emailName) {
    return emailName
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toLocaleUpperCase('pt-BR')}${part.slice(1)}`)
      .join(' ');
  }

  return 'Cliente';
}

export function getUserInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('pt-BR'))
    .join('');
}
