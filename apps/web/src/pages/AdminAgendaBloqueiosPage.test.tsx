import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAgendaBloqueiosPage } from './AdminAgendaBloqueiosPage';
import { buscarClientesAdmin } from '@/services/clientes-admin-service';
import * as agendaAdminService from '@/services/agenda-admin-service';

vi.mock('@/services/clientes-admin-service', () => ({ buscarClientesAdmin: vi.fn() }));

const clients = [
  {
    id: 'client-1',
    nome: 'Mariana Silva',
    email: 'mariana@example.com',
    telefone: '(11) 99999-0000',
    totalAtendimentosMes: 0,
  },
];

describe('AdminAgendaBloqueiosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(buscarClientesAdmin).mockResolvedValue(clients);
    vi.spyOn(agendaAdminService, 'listarBloqueiosAdmin').mockResolvedValue([]);
    vi.spyOn(agendaAdminService, 'listarHorariosFixosAdmin').mockResolvedValue([]);
    vi.spyOn(agendaAdminService, 'criarBloqueioAdmin').mockImplementation(async (input) => ({
      id: 'block-1',
      ...input,
      profissionalId: input.profissionalId ?? 'default',
      ativo: true,
      criadoPor: 'admin-1',
      criadoEm: '2026-11-25T12:00:00.000Z',
    }));
    vi.spyOn(agendaAdminService, 'criarHorarioFixoAdmin').mockImplementation(async (input) => ({
      id: 'fixed-1',
      ...input,
      profissionalId: input.profissionalId ?? 'default',
      ativo: true,
      criadoPor: 'admin-1',
      criadoEm: '2026-11-25T12:00:00.000Z',
    }));
    vi.spyOn(agendaAdminService, 'atualizarHorarioFixoAdmin').mockResolvedValue({
      id: 'fixed-1',
      clienteId: 'client-1',
      clienteNome: 'Mariana Silva',
      diaSemana: 1,
      horaInicio: '09:00',
      horaFim: '10:00',
      frequencia: 'semanal',
      dataInicio: '2026-11-25',
      profissionalId: 'default',
      ativo: true,
      criadoPor: 'admin-1',
      criadoEm: '2026-11-25T12:00:00.000Z',
    });
    vi.spyOn(agendaAdminService, 'removerBloqueioAdmin').mockResolvedValue({
      id: 'block-1',
      removido: true,
    });
    vi.spyOn(agendaAdminService, 'alterarStatusBloqueioAdmin').mockResolvedValue({
      id: 'block-1',
      tipo: 'unico',
      data: '2026-12-01',
      horaInicio: '00:00',
      horaFim: '23:59',
      diaInteiro: true,
      motivo: 'Feriado',
      profissionalId: 'default',
      ativo: false,
      criadoPor: 'admin-1',
      criadoEm: '2026-11-25T12:00:00.000Z',
    });
    vi.spyOn(agendaAdminService, 'removerHorarioFixoAdmin').mockResolvedValue({
      id: 'fixed-1',
      removido: true,
    });
  });

  const renderPage = () => render(<AdminAgendaBloqueiosPage />, { wrapper: MemoryRouter });

  it('cria um bloqueio de dia inteiro pela API administrativa', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Bloqueios e clientes fixos' });

    fireEvent.change(screen.getByLabelText('Tipo de bloqueio'), { target: { value: 'unico' } });
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-12-01' } });
    fireEvent.click(screen.getByLabelText('Bloquear o dia inteiro'));
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Feriado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar bloqueio' }));

    await waitFor(() => {
      expect(agendaAdminService.criarBloqueioAdmin).toHaveBeenCalledWith({
        tipo: 'unico',
        data: '2026-12-01',
        horaInicio: '00:00',
        horaFim: '23:59',
        diaInteiro: true,
        motivo: 'Feriado',
        profissionalId: 'default',
      });
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Bloqueio criado na agenda.');
  });

  it('cria uma reserva recorrente com os dados do perfil do cliente', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Bloqueios e clientes fixos' });
    fireEvent.click(screen.getByRole('tab', { name: 'Clientes fixos' }));
    fireEvent.change(screen.getByLabelText('Cliente cadastrado'), {
      target: { value: 'client-1' },
    });
    fireEvent.change(screen.getByLabelText('Dia da semana'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Frequência'), { target: { value: 'quinzenal' } });
    fireEvent.change(screen.getByLabelText('Válido a partir de'), {
      target: { value: '2026-12-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reservar horário' }));

    await waitFor(() => {
      expect(agendaAdminService.criarHorarioFixoAdmin).toHaveBeenCalledWith(
        expect.objectContaining({
          clienteId: 'client-1',
          clienteNome: 'Mariana Silva',
          clienteEmail: 'mariana@example.com',
          clienteTelefone: '(11) 99999-0000',
          diaSemana: 2,
          frequencia: 'quinzenal',
          dataInicio: '2026-12-01',
        }),
      );
    });
  });

  it('abre a edição do horário fixo existente e salva pela API', async () => {
    vi.mocked(agendaAdminService.listarHorariosFixosAdmin).mockResolvedValue([
      {
        id: 'fixed-1',
        clienteId: 'client-1',
        clienteNome: 'Mariana Silva',
        diaSemana: 1,
        horaInicio: '09:00',
        horaFim: '10:00',
        frequencia: 'semanal',
        dataInicio: '2026-11-25',
        profissionalId: 'default',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-11-25T12:00:00.000Z',
      },
    ]);
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: 'Clientes fixos' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '10:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(agendaAdminService.atualizarHorarioFixoAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'fixed-1', horaFim: '10:30' }),
      );
    });
  });
});
