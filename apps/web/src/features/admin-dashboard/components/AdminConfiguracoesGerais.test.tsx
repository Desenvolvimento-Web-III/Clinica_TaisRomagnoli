import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminConfiguracoesGerais } from './AdminConfiguracoesGerais';
import * as settingsService from '@/services/clinic-settings-service';
import { clinicSettingsFixture } from '@/test/fixtures';

describe('AdminConfiguracoesGerais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(settingsService, 'buscarConfiguracoesGerais').mockResolvedValue(
      clinicSettingsFixture,
    );
    vi.spyOn(settingsService, 'salvarConfiguracoesGerais').mockImplementation(
      async (settings) => settings,
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
      clinicSettingsFixture.contatos?.telefone,
    );
    expect(screen.getByLabelText(/WhatsApp Comercial/i)).toHaveValue(
      clinicSettingsFixture.contatos?.whatsapp,
    );
    expect(screen.getByLabelText(/E-mail de Contato/i)).toHaveValue(
      clinicSettingsFixture.contatos?.email,
    );
    expect(screen.getByLabelText(/Endereço Físico/i)).toHaveValue(
      clinicSettingsFixture.contatos?.endereco,
    );

    // Políticas
    expect(screen.getByLabelText(/Política de Cancelamento Oficial/i)).toHaveValue(
      clinicSettingsFixture.politicas?.politicaCancelamento,
    );
    expect(screen.getByLabelText(/Tolerância de Atraso/i)).toHaveValue(
      clinicSettingsFixture.politicas?.toleranciaAtrasoMinutos,
    );

    // Sinal
    expect(screen.getByLabelText(/Percentual do Sinal/i)).toHaveValue(
      clinicSettingsFixture.percentualSinal,
    );

    // Lembretes
    expect(screen.getByLabelText(/Habilitar envio automático de lembretes prévios/i)).toBeChecked();
    expect(screen.getByLabelText(/Antecedência do Disparo/i)).toHaveValue(
      clinicSettingsFixture.lembretes?.antecedenciaHoras,
    );

    // Prazos
    expect(screen.getByLabelText(/Antecedência Mínima para Agendar/i)).toHaveValue(
      clinicSettingsFixture.prazos?.antecedenciaMinimaAgendamentoHoras,
    );
    expect(screen.getByLabelText(/Antecedência Mínima Cancelamento/i)).toHaveValue(
      clinicSettingsFixture.antecedenciaMinimaCancelamentoHoras,
    );
    expect(screen.getByLabelText(/Intervalo entre Sessões/i)).toHaveValue(
      clinicSettingsFixture.intervaloMinutos,
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

});
