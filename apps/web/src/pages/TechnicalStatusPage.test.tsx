import { render, screen } from '@testing-library/react';
import { TechnicalStatusPage } from './TechnicalStatusPage';

describe('TechnicalStatusPage', () => {
  it('informa que a fundação técnica está configurada', () => {
    render(<TechnicalStatusPage />);

    expect(screen.getByRole('heading', { name: 'Ambiente configurado' })).toBeInTheDocument();
    expect(screen.getByText(/somente um smoke test/i)).toBeInTheDocument();
  });
});
