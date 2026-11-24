import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PwaInstallBanner } from './PwaInstallBanner';
import * as pwaHook from '../usePwaInstall';

describe('PwaInstallBanner component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza o banner quando canInstall for false', () => {
    vi.spyOn(pwaHook, 'usePwaInstall').mockReturnValue({
      canInstall: false,
      isStandalone: false,
      isIos: false,
      isDismissed: false,
      installed: false,
      hasPrompt: false,
      installApp: vi.fn(),
      dismissInstall: vi.fn(),
    });

    const { container } = render(<PwaInstallBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza o banner com título e botões quando a instalação estiver disponível', async () => {
    const mockInstall = vi.fn();
    const mockDismiss = vi.fn();

    vi.spyOn(pwaHook, 'usePwaInstall').mockReturnValue({
      canInstall: true,
      isStandalone: false,
      isIos: false,
      isDismissed: false,
      installed: false,
      hasPrompt: true,
      installApp: mockInstall,
      dismissInstall: mockDismiss,
    });

    render(<PwaInstallBanner />);

    expect(screen.getByText('Instalar Tais Romagnoli')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Instalar agora/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mais tarde/i })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Instalar agora/i }));
    });
    expect(mockInstall).toHaveBeenCalledTimes(1);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Mais tarde/i }));
    });
    expect(mockDismiss).toHaveBeenCalledWith(7);
  });

  it('exibe instruções de instalação no iOS ao clicar em Como instalar', () => {
    vi.spyOn(pwaHook, 'usePwaInstall').mockReturnValue({
      canInstall: true,
      isStandalone: false,
      isIos: true,
      isDismissed: false,
      installed: false,
      hasPrompt: false,
      installApp: vi.fn(),
      dismissInstall: vi.fn(),
    });

    render(<PwaInstallBanner />);

    const btnIos = screen.getByRole('button', { name: /Como instalar/i });
    expect(btnIos).toBeInTheDocument();

    act(() => {
      fireEvent.click(btnIos);
    });

    expect(screen.getByText(/Para instalar no iPhone ou iPad \(Safari\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Adicionar à Tela de Início/i)).toBeInTheDocument();
  });
});
