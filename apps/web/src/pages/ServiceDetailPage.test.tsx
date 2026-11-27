import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as serviceRepository from '@/features/services/service-firestore-repository';
import { ServiceDetailPage } from './ServiceDetailPage';

const serviceFixture = {
  id: 'massagem-relaxante',
  name: 'Massagem Relaxante',
  description: 'Massagem realizada com movimentos suaves para promover relaxamento.',
  durationMinutes: 60,
  priceInCents: 17000,
  sinalInCents: 5100,
  sinalPercentual: 30,
  imageSrc: '',
  imageAlt: 'Massagem Relaxante',
  active: true,
  category: 'Corporal',
};

describe('ServiceDetailPage', () => {
  it('exibe mensagem amigável quando o serviço não é encontrado', async () => {
    vi.spyOn(serviceRepository, 'subscribeToServicesFromFirestore').mockImplementation((update) => {
      update([]);
      return () => {};
    });
    render(
      <MemoryRouter initialEntries={['/servicos/servico-inexistente']}>
        <Routes>
          <Route path="/servicos/:serviceId" element={<ServiceDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Serviço não encontrado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar ao catálogo de serviços/i })).toHaveAttribute(
      'href',
      '/servicos',
    );
  });

  it('exibe descrição, duração, valor, sinal e botão para agendar do serviço existente', async () => {
    vi.spyOn(serviceRepository, 'subscribeToServicesFromFirestore').mockImplementation((update) => {
      update([serviceFixture]);
      return () => {};
    });
    render(
      <MemoryRouter initialEntries={['/servicos/massagem-relaxante']}>
        <Routes>
          <Route path="/servicos/:serviceId" element={<ServiceDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Título
    expect(
      await screen.findByRole('heading', { name: 'Massagem Relaxante', level: 1 }),
    ).toBeInTheDocument();

    // Duração (60 min)
    expect(screen.getAllByText('60 min').length).toBeGreaterThan(0);

    // Valor da sessão (R$ 170,00)
    expect(screen.getByText(/R\$\s*170,00/)).toBeInTheDocument();

    // Sinal para reserva (30% de 170 = R$ 51,00)
    expect(screen.getByText(/Sinal para reserva \(30%\)/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*51,00/)).toBeInTheDocument();

    // Saldo no atendimento (170 - 51 = R$ 119,00)
    expect(screen.getByText(/R\$\s*119,00/)).toBeInTheDocument();

    // Descrição
    expect(screen.getByText(/Massagem realizada com movimentos suaves/i)).toBeInTheDocument();

    // Botão para agendar
    const agendarBtn = screen.getByRole('link', { name: /agendar este serviço/i });
    expect(agendarBtn).toBeInTheDocument();
    expect(agendarBtn).toHaveAttribute('href', '/agendar/massagem-relaxante');
  });
});
