import { describe, expect, it } from 'vitest';
import { workspaceStatus } from './index.js';

describe('@clinica/shared', () => {
  it('expõe o contrato técnico entre os workspaces', () => {
    expect(workspaceStatus).toEqual({ state: 'ready', source: 'shared-package' });
  });
});
