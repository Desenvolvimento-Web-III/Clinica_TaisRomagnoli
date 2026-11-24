import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineNotice } from './OfflineNotice';

describe('OfflineNotice component', () => {
  it('não renderiza nada enquanto o usuário estiver online', () => {
    const { container } = render(<OfflineNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it('exibe alerta acessível ao entrar em modo offline', () => {
    render(<OfflineNotice />);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(
      screen.getByText(/Você está sem internet\. O aplicativo continua acessível/i),
    ).toBeInTheDocument();
  });
});
