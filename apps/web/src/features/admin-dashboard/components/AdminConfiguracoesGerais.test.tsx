import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminConfiguracoesGerais } from './AdminConfiguracoesGerais';
import * as settingsService from '@/services/clinic-settings-service';
import { DEFAULT_CLINIC_SETTINGS } from '@clinica/shared';

describe('AdminConfiguracoesGerais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(settingsService, 'buscarConfiguracoesGerais').mockResolvedValue(
      DEFAULT_CLINIC_SETTINGS,
    );
    vi.spyOn(settingsService, 'salvarConfiguracoesGerais').mockImplementation(
      async (settings) => settings,
    );
    vi.spyOn(settingsService, 'restaurarConfiguracoesPadrao').mockResolvedValue(
      DEFAULT_CLINIC_SETTINGS,
    );
  });

  it('renderiza os dados de contatos, políticas, sinal, lembretes e prazos após o carregamento', async () => {
    render(<AdminConfiguracoesGerais />);

    // Aguarda término do loading
    await waitFor(() => {
      expect(screen.queryByText(/Carregando configurações/i)).not.toBeInTheDocument();
    });

    // Contatos
    expect(screen.getByLabelText(/Telefone Comercial/i)).toHaveValue(
      DEFAULT_CLINIC_SETTINGS.contatos?.telefone,
    );
    expect(screen.getByLabelText(/WhatsApp Comercial/i)).toHaveValue(
      DEFAULT_CLINIC_SETTINGS.contatos?.whatsapp,
    );
    expect(screen.getByLabelText(/E-mail de Contato/i)).toHaveValue(
      DEFAULT_CLINIC_SETTINGS.contatos?.email,
    );
    expect(screen.getByLabelText(/Endereço Físico/i)).toHaveValue(
      DEFAULT_CLINIC_SETTINGS.contatos?.endereco,
    );

    // Políticas
    expect(screen.getByLabelText(/Política de Cancelamento Oficial/i)).toHaveValue(
      DEFAULT_CLINIC_SETTINGS.politicas?.politicaCancelamento,
    );
    expect(screen.getByLabelText(/Tolerância de Atraso/i)).toHaveValue(
      DEFAULT_CLINIC_SETTINGS.politicas?.toleranciaAtrasoMinutos,
    );

    // Sinal
    expect(screen.getByLabelText(/Percentual do Sinal/i)).toHaveValue(
      DEFAULT_CLINIC_SETTINGS.percentualSinal,
    );

    // Lembretes
    expect(screen.getByLabelText(/Habilitar envio automático de lembretes prévios/i)).toBeChecked();
    expect(screen.getByLabelText(/Antecedência do Disparo/i)).toHaveValue(
      DEFAULT_CLINIC_SETTINGS.lembretes?.antecedenciaHoras,
    );

    // Prazos
    expect(screen.getByLabelText(/Antecedência Mínima para Agendar/i)).toHaveValue(
      DEFAULT_CLINIC_SETTINGS.prazos?.antecedenciaMinimaAgendamentoHoras,
    );
    expect(screen.getByLabelText(/Antecedência Mínima Cancelamento/i)).toHaveValue(
      DEFAULT_CLINIC_SETTINGS.antecedenciaMinimaCancelamentoHoras,
    );
    expect(screen.getByLabelText(/Intervalo entre Sessões/i)).toHaveValue(
      DEFAULT_CLINIC_SETTINGS.intervaloMinutos,
    );
  });

  it('permite alterar campos e salvar com sucesso', async () => {
    render(<AdminConfiguracoesGerais />);

    await waitFor(() => {
      expect(screen.queryByText(/Carregando configurações/i)).not.toBeInTheDocument();
    });

    const inputTelefone = screen.getByLabelText(/Telefone Comercial/i);
    fireEvent.change(inputTelefone, { target: { value: '(11) 91234-5678' } });

    const inputSinal = screen.getByLabelText(/Percentual do Sinal/i);
    fireEvent.change(inputSinal, { target: { value: '40' } });

    const botaoSalvar = screen.getByRole('button', { name: /Salvar Configurações/i });
    fireEvent.click(botaoSalvar);

    await waitFor(() => {
      expect(settingsService.salvarConfiguracoesGerais).toHaveBeenCalled();
      expect(
        screen.getByText(/Configurações gerais da clínica atualizadas com sucesso!/i),
      ).toBeInTheDocument();
    });
  });

  it('permite restaurar os padrões oficiais com confirmação do usuário', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<AdminConfiguracoesGerais />);

    await waitFor(() => {
      expect(screen.queryByText(/Carregando configurações/i)).not.toBeInTheDocument();
    });

    const botaoRestaurar = screen.getByRole('button', {
      name: /Restaurar Padrões Oficiais/i,
    });
    fireEvent.click(botaoRestaurar);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(settingsService.restaurarConfiguracoesPadrao).toHaveBeenCalled();
      expect(
        screen.getByText(/Configurações restauradas com sucesso para os padrões oficiais!/i),
      ).toBeInTheDocument();
    });
  });
});
