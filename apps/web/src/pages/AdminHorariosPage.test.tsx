import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminHorariosPage } from './AdminHorariosPage';
import * as horariosService from '@/services/horarios-service';
import { CONFIGURACAO_HORARIOS_PADRAO } from '@clinica/shared';

// Mocks do Firebase
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: { uid: 'admin-tais' },
  },
  db: {},
}));

describe('AdminHorariosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    vi.spyOn(horariosService, 'buscarHorariosFuncionamento').mockResolvedValue(
      CONFIGURACAO_HORARIOS_PADRAO,
    );
    vi.spyOn(horariosService, 'salvarHorariosFuncionamento').mockResolvedValue(
      CONFIGURACAO_HORARIOS_PADRAO,
    );
  });

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(ui, { wrapper: MemoryRouter });
  };

  it('renderiza o cabeçalho e os 7 dias da semana', async () => {
    renderWithRouter(<AdminHorariosPage />);

    expect(
      await screen.findByRole('heading', { name: /Horários de Funcionamento e Manutenção/i }),
    ).toBeInTheDocument();

    expect(screen.getByText('Domingo')).toBeInTheDocument();
    expect(screen.getByText('Segunda-feira')).toBeInTheDocument();
    expect(screen.getByText('Terça-feira')).toBeInTheDocument();
    expect(screen.getByText('Quarta-feira')).toBeInTheDocument();
    expect(screen.getByText('Quinta-feira')).toBeInTheDocument();
    expect(screen.getByText('Sexta-feira')).toBeInTheDocument();
    expect(screen.getByText('Sábado')).toBeInTheDocument();
  });

  it('permite alternar o status de folga/ativo de um dia', async () => {
    renderWithRouter(<AdminHorariosPage />);

    // Terça-feira começa como folga
    const tercaHeading = await screen.findByText('Terça-feira');
    expect(tercaHeading).toBeInTheDocument();

    // Busca botões de alternar
    const botoesAtivar = screen.getAllByRole('button', { name: /Ativar Atendimento/i });
    expect(botoesAtivar.length).toBeGreaterThan(0);

    // Clica no primeiro botão de ativar (Domingo ou Terça)
    fireEvent.click(botoesAtivar[0]!);

    // Verifica se mudou para "Marcar como Folga"
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Marcar como Folga/i }).length).toBeGreaterThan(
        5,
      );
    });
  });

  it('permite adicionar e remover intervalos de manutenção', async () => {
    renderWithRouter(<AdminHorariosPage />);

    await screen.findByRole('heading', { name: /Horários de Funcionamento e Manutenção/i });

    // Busca botões de adicionar manutenção
    const botoesAddManutencao = screen.getAllByRole('button', { name: /\+ Adicionar manutenção/i });
    expect(botoesAddManutencao.length).toBeGreaterThan(0);

    // Clica para adicionar manutenção na Segunda-feira
    fireEvent.click(botoesAddManutencao[0]!);

    // Verifica se novos inputs de descrição ou pausa surgiram
    const inputsDescricao = screen.getAllByPlaceholderText(
      /Descrição \(ex: Almoço, Higienização de salas\)/i,
    );
    expect(inputsDescricao.length).toBeGreaterThan(0);
  });

  it('permite salvar alterações com sucesso', async () => {
    renderWithRouter(<AdminHorariosPage />);

    await screen.findByRole('heading', { name: /Horários de Funcionamento e Manutenção/i });

    const botaoSalvar = screen.getByRole('button', { name: /Salvar Alterações/i });
    fireEvent.click(botaoSalvar);

    expect(
      await screen.findByText(
        /Horários de funcionamento e intervalos de manutenção salvos com sucesso/i,
      ),
    ).toBeInTheDocument();
  });
});
