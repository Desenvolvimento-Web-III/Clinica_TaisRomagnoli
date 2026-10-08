import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AgendamentoFlowPage } from './AgendamentoFlowPage';

describe('AgendamentoFlowPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderFlow = (initialRoute = '/agendar/massagem-relaxante') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/agendar/:serviceId" element={<AgendamentoFlowPage />} />
          <Route path="/agendar" element={<AgendamentoFlowPage />} />
          <Route path="/servicos" element={<div>Página de Serviços</div>} />
          <Route path="/agendamentos" element={<div>Página de Meus Agendamentos</div>} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('renderiza o Calendário na etapa inicial com legendas e navegação de mês', () => {
    renderFlow('/agendar/massagem-relaxante');

    expect(screen.getByText('Calendário')).toBeInTheDocument();
    expect(screen.getByTestId('legenda-disponivel')).toBeInTheDocument();
    expect(screen.getByTestId('legenda-indisponivel')).toBeInTheDocument();
    expect(screen.getByTestId('select-mes')).toBeInTheDocument();
    expect(screen.getByTestId('select-ano')).toBeInTheDocument();
    expect(
      screen.getByText(/Intervalos de 30 minutos são reservados automaticamente/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('confirmar-agendamento-btn')).toBeInTheDocument();
  });

  it('permite selecionar data e horário no Calendário e avançar para confirmação', () => {
    renderFlow('/agendar/massagem-relaxante');

    // Seleciona um dia disponível (ex: dia 23)
    const dia23 = screen.getByTestId('dia-disponivel-2026-10-23');
    fireEvent.click(dia23);

    // Seleciona um slot de horário (ex: 11:00)
    const slot11 = screen.getByTestId('slot-hora-11:00');
    fireEvent.click(slot11);

    // Clica em Confirmar Agendamento
    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn'));

    // Chega na tela de Confirmação do Agendamento (Somente leitura)
    expect(screen.getByText('Confirmação do Agendamento')).toBeInTheDocument();
    expect(screen.getByText(/Nome do cliente/i)).toBeInTheDocument();
    expect(screen.getByTestId('nome-cliente-display')).toHaveTextContent('Mariana Souza');
    expect(screen.getByText('Tais Romagnoli')).toBeInTheDocument();
    expect(screen.getByText('Massagem Relaxante')).toBeInTheDocument();
    expect(screen.getByText(/11:00 às 12:00/i)).toBeInTheDocument();
    expect(screen.getByTestId('avancar-pagamento-btn')).toBeInTheDocument();
    expect(screen.getByTestId('voltar-btn')).toBeInTheDocument();
    // Confirma que não existem campos editáveis (inputs/selects de alteração)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('permite voltar do formulário de confirmação para o Calendário', () => {
    renderFlow('/agendar/massagem-relaxante');

    // Avança para confirmação
    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn'));
    expect(screen.getByText('Confirmação do Agendamento')).toBeInTheDocument();

    // Clica em Voltar
    fireEvent.click(screen.getByTestId('voltar-btn'));
    expect(screen.getByText('Calendário')).toBeInTheDocument();
  });

  it('avança pelo fluxo completo: Calendário -> Confirmação -> Pagamento (PIX) -> Agendamento Concluído', async () => {
    renderFlow('/agendar/massagem-relaxante');

    // Calendário -> Confirmação
    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn'));
    expect(screen.getByText('Confirmação do Agendamento')).toBeInTheDocument();

    // Confirmação -> Pagamento
    fireEvent.click(screen.getByTestId('avancar-pagamento-btn'));
    expect(screen.getByRole('heading', { name: 'Pagamento' })).toBeInTheDocument();
    expect(screen.getByTestId('pix-qrcode-container')).toBeInTheDocument();

    // Pagamento -> Finalizar
    fireEvent.click(screen.getByTestId('finalizar-agendamento-btn'));

    // Agendamento Concluído (fundo verde)
    expect(screen.getByTestId('pagina-confirmacao-concluido')).toBeInTheDocument();
    expect(screen.getByText('Agendamento Concluído!')).toBeInTheDocument();

    // Clica para ver agendamentos
    fireEvent.click(screen.getByTestId('ver-meus-agendamentos-btn'));
    await waitFor(() => {
      expect(screen.getByText('Página de Meus Agendamentos')).toBeInTheDocument();
    });
  });

  it('permite alternar métodos de pagamento no passo de Pagamento', () => {
    renderFlow('/agendar/massagem-relaxante');

    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn'));
    fireEvent.click(screen.getByTestId('avancar-pagamento-btn'));

    // Alterna para Cartão
    fireEvent.click(screen.getByTestId('metodo-cartao-btn'));
    expect(screen.getByTestId('cartao-form-container')).toBeInTheDocument();

    // Alterna para Boleto
    fireEvent.click(screen.getByTestId('metodo-boleto-btn'));
    expect(screen.getByTestId('boleto-info-container')).toBeInTheDocument();
    expect(screen.getByTestId('copiar-boleto-btn')).toBeInTheDocument();
  });

  it('valida campos do cartão de crédito e aplica máscaras antes de finalizar', () => {
    renderFlow('/agendar/massagem-relaxante');

    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn'));
    fireEvent.click(screen.getByTestId('avancar-pagamento-btn'));
    fireEvent.click(screen.getByTestId('metodo-cartao-btn'));

    // Tenta finalizar com campos vazios
    fireEvent.click(screen.getByTestId('finalizar-agendamento-btn'));

    // Deve exibir mensagens de erro
    expect(screen.getByTestId('cartao-numero-error')).toHaveTextContent(
      'Informe o número do cartão.',
    );
    expect(screen.getByTestId('cartao-nome-error')).toHaveTextContent(
      'Informe o nome impresso no cartão.',
    );
    expect(screen.getByTestId('cartao-validade-error')).toHaveTextContent('Informe a validade.');
    expect(screen.getByTestId('cartao-cvv-error')).toHaveTextContent('Informe o código CVV.');

    // Preenche com máscaras
    const inputNumero = screen.getByLabelText(/Número do Cartão/i);
    fireEvent.change(inputNumero, { target: { value: '4111222233334444' } });
    expect(inputNumero).toHaveValue('4111 2222 3333 4444');
    expect(screen.getByTestId('cartao-bandeira-badge')).toHaveTextContent(/visa/i);

    const inputNome = screen.getByLabelText(/Nome impresso no Cartão/i);
    fireEvent.change(inputNome, { target: { value: 'mariana souza' } });
    expect(inputNome).toHaveValue('MARIANA SOUZA');

    const inputValidade = screen.getByLabelText(/Validade/i);
    fireEvent.change(inputValidade, { target: { value: '1230' } });
    expect(inputValidade).toHaveValue('12/30');

    const inputCvv = screen.getByLabelText(/CVV/i);
    fireEvent.change(inputCvv, { target: { value: '123' } });
    expect(inputCvv).toHaveValue('123');

    // Finaliza com sucesso
    fireEvent.click(screen.getByTestId('finalizar-agendamento-btn'));
    expect(screen.getByText('Agendamento Concluído!')).toBeInTheDocument();
  });
});
