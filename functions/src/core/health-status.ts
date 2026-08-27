import type { WorkspaceStatus } from '@clinica/shared';

export type HealthStatus = Readonly<{
  ok: true;
  service: 'functions';
  workspace: WorkspaceStatus;
}>;

export function getHealthStatus(): HealthStatus {
  return {
    ok: true,
    service: 'functions',
    workspace: {
      state: 'ready',
      source: 'shared-package',
    },
  };
}
