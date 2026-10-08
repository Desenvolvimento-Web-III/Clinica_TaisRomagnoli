import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FichaAnamnesePage } from './FichaAnamnesePage';

const mockUseOptionalAuth = vi.fn();

vi.mock('@/features/auth/auth-context', () => ({
  useOptionalAuth: () => mockUseOptionalAuth(),
  useAuth: () => mockUseOptionalAuth(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'client-123',
      displayName: 'Ana Clara',
      email: 'anaclara@exemplo.com',
    },
  },
  db: {},
}));

describe('FichaAnamnesePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseOptionalAuth.mockReturnValue({
      currentUser: {
        uid: 'client-123',
        displayName: 'Ana Clara',
        email: 'anaclara@exemplo.com',
      },
      isAuthReady: true,
      logout: vi.fn(),
    });
  });

  it('renderiza o cabeçalho, aviso de privacidade e a primeira etapa (Queixa)', () => {
    render(
      <MemoryRouter initialEntries={['/anamnese']}>
        <Routes>
          <Route path="/anamnese" element={<FichaAnamnesePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /ficha de anamnese/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/privacidade e cuidado/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /1\. objetivo e queixa principal/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/objetivo principal do atendimento/i)).toBeInTheDocument();
  });

  it('permite navegar entre as seções usando os botões e os indicadores de etapa', async () => {
    render(
      <MemoryRouter initialEntries={['/anamnese']}>
        <Routes>
          <Route path="/anamnese" element={<FichaAnamnesePage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Avança da etapa 1 para etapa 2
    const avancarSaudeBtn = screen.getByRole('button', {
      name: /avançar para histórico de saúde/i,
    });
    fireEvent.click(avancarSaudeBtn);

    expect(
      await screen.findByRole('heading', { name: /2\. histórico de saúde/i }),
    ).toBeInTheDocument();

    // Avança para etapa 3
    const avancarHabitosBtn = screen.getByRole('button', {
      name: /avançar para hábitos & preferências/i,
    });
    fireEvent.click(avancarHabitosBtn);

    expect(
      await screen.findByRole('heading', { name: /3\. preferências e hábitos/i }),
    ).toBeInTheDocument();

    // Avança para etapa 4
    const avancarTermosBtn = screen.getByRole('button', { name: /avançar para consentimento/i });
    fireEvent.click(avancarTermosBtn);

    expect(
      await screen.findByRole('heading', { name: /4\. termo de consentimento/i }),
    ).toBeInTheDocument();

    // Volta para etapa 1 pelo indicador de passos
    const step1Btn = screen.getByRole('button', { name: /etapa 1/i });
    fireEvent.click(step1Btn);

    expect(
      await screen.findByRole('heading', { name: /1\. objetivo e queixa principal/i }),
    ).toBeInTheDocument();
  });

  it('permite selecionar regiões do corpo e alterar a escala de dor', async () => {
    render(
      <MemoryRouter initialEntries={['/anamnese']}>
        <Routes>
          <Route path="/anamnese" element={<FichaAnamnesePage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Seleciona região de pescoço
    const pescocoBtn = screen.getByRole('checkbox', { name: /pescoço e nuca/i });
    fireEvent.click(pescocoBtn);
    expect(pescocoBtn).toHaveAttribute('aria-checked', 'true');

    // Altera escala de dor para 7
    const dor7Btn = screen.getByRole('radio', { name: '7' });
    fireEvent.click(dor7Btn);
    expect(dor7Btn).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/dor intensa \/ rigidez acentuada/i)).toBeInTheDocument();
  });

  it('exibe campo de detalhes ao marcar "Sim" em uma condição clínica', async () => {
    render(
      <MemoryRouter initialEntries={['/anamnese']}>
        <Routes>
          <Route path="/anamnese" element={<FichaAnamnesePage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Vai para a etapa 2 (saúde)
    fireEvent.click(screen.getByRole('button', { name: /avançar para histórico de saúde/i }));

    // Clica em "Sim" para alergias
    const alergiaLegend = await screen.findByText(/5\. apresenta alergia a cosméticos/i);
    const alergiaSimRadio = alergiaLegend.closest('fieldset')!.querySelector('input[value="sim"]')!;

    fireEvent.click(alergiaSimRadio);

    // Campo de texto de detalhes deve aparecer
    expect(
      await screen.findByPlaceholderText(/quais substâncias ou essências/i),
    ).toBeInTheDocument();
  });

  it('valida o formulário exigindo o aceite do termo de consentimento', async () => {
    render(
      <MemoryRouter initialEntries={['/anamnese']}>
        <Routes>
          <Route path="/anamnese" element={<FichaAnamnesePage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Vai para a etapa 4 (consentimento)
    fireEvent.click(screen.getByRole('button', { name: /etapa 4/i }));

    // Tenta submeter sem marcar o consentimento
    const submitBtn = screen.getByRole('button', { name: /salvar ficha de anamnese/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/é necessário confirmar o termo de consentimento/i),
    ).toBeInTheDocument();
  });

  it('preenche, aceita o termo e submete com sucesso exibindo o resumo consolidado', async () => {
    render(
      <MemoryRouter initialEntries={['/anamnese']}>
        <Routes>
          <Route path="/anamnese" element={<FichaAnamnesePage />} />
        </Routes>
      </MemoryRouter>,
    );

    // 1. Etapa de queixa: escolhe objetivo e avança
    const objetivoSelect = screen.getByLabelText(/objetivo principal do atendimento/i);
    fireEvent.change(objetivoSelect, {
      target: { value: 'Relaxamento profundo e redução de estresse' },
    });
    fireEvent.click(screen.getByRole('button', { name: /avançar para histórico de saúde/i }));

    // 2. Etapa de saúde: marca alergia a óleos
    const alergiaFieldset = (
      await screen.findByText(/5\. apresenta alergia a cosméticos/i)
    ).closest('fieldset')!;
    const simRadio = alergiaFieldset.querySelector('input[value="sim"]')!;
    fireEvent.click(simRadio);

    const detalhesInput = await screen.findByPlaceholderText(/quais substâncias ou essências/i);
    fireEvent.change(detalhesInput, { target: { value: 'Alergia a óleo de lavanda' } });

    fireEvent.click(screen.getByRole('button', { name: /avançar para hábitos & preferências/i }));

    // 3. Etapa de preferências: escolhe suave
    const pressaoSuaveBtn = await screen.findByRole('radio', { name: /suave/i });
    fireEvent.click(pressaoSuaveBtn);

    fireEvent.click(screen.getByRole('button', { name: /avançar para consentimento/i }));

    // 4. Etapa de consentimento: marca o checkbox e submete
    const consentCheckbox = await screen.findByRole('checkbox', {
      name: /li, compreendi e concordo com o termo de consentimento/i,
    });
    fireEvent.click(consentCheckbox);

    const submitBtn = screen.getByRole('button', { name: /salvar ficha de anamnese/i });
    fireEvent.click(submitBtn);

    // Valida feedback de sucesso e resumo
    expect(
      await screen.findByRole('heading', { name: /ficha de anamnese preenchida com sucesso!/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/alergias: alergia a óleo de lavanda/i)).toBeInTheDocument();
    expect(screen.getByText(/relaxamento profundo e redução de estresse/i)).toBeInTheDocument();

    // Testa botão "Editar Respostas"
    const editarBtn = screen.getByRole('button', { name: /editar respostas/i });
    fireEvent.click(editarBtn);

    expect(
      await screen.findByRole('heading', { name: /1\. objetivo e queixa principal/i }),
    ).toBeInTheDocument();
  });
});
