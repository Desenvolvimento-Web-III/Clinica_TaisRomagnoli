type BrandLogoProps = Readonly<{
  className?: string;
}>;

export function BrandLogo({ className = '' }: BrandLogoProps) {
  return (
    <img
      src="/logo-login.png"
      alt="Tais Romagnoli — Massoterapia"
      width="240"
      height="104"
      className={`h-auto w-[132px] object-contain sm:w-[148px] ${className}`}
    />
  );
}
