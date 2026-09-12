import type { User } from 'firebase/auth';
import { getUserDisplayName, getUserInitials } from './user-display';

describe('user-display', () => {
  it('prioriza o nome definido no perfil de autenticação', () => {
    const user = { displayName: '  Maria Silva  ', email: 'maria@exemplo.com' } as User;

    expect(getUserDisplayName(user)).toBe('Maria Silva');
    expect(getUserInitials(getUserDisplayName(user))).toBe('MS');
  });

  it('cria um nome legível a partir do e-mail quando o perfil ainda não tem nome', () => {
    const user = { displayName: null, email: 'maria.silva@exemplo.com' } as User;

    expect(getUserDisplayName(user)).toBe('Maria Silva');
  });
});
