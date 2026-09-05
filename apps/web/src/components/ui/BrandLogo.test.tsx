import { render, screen } from '@testing-library/react';
import { BrandLogo } from './BrandLogo';

describe('BrandLogo', () => {
  it('exibe a marca no topo esquerdo da página', () => {
    render(<BrandLogo />);

    const logo = screen.getByRole('img', { name: 'Tais Romagnoli — Massoterapia' });

    expect(logo).toHaveAttribute('src', '/logo-login.png');
    expect(logo).toHaveClass('absolute', 'left-4', 'top-4', 'w-[120px]');
  });
});
