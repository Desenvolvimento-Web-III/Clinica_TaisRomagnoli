import { render, screen } from '@testing-library/react';
import { BrandLogo } from './BrandLogo';

describe('BrandLogo', () => {
  it('exibe a marca no topo esquerdo da página', () => {
    render(<BrandLogo />);

    const logo = screen.getByRole('img', { name: 'Tais Romagnoli — Massoterapia' });

    expect(logo).toHaveAttribute('src', '/logo-login.png');
    expect(logo).toHaveAttribute('width', '240');
    expect(logo).toHaveClass('w-[132px]', 'object-contain');
  });
});
