type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <span className="inline-flex items-center gap-3 text-foreground">
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-full bg-primary text-primary-contrast"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none">
          <path
            d="M18.8 5.2C12.7 5.5 7.2 8.5 6.1 14c-.5 2.6 1.4 4.8 4 4.8 5.4 0 8.2-6.1 8.7-13.6Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M5 20c2.1-4.7 5.4-7.7 10.4-9.7"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      </span>
      <span className="leading-none">
        {!compact && (
          <span className="block text-[0.62rem] font-bold tracking-[0.18em] text-muted uppercase">
            Conexão
          </span>
        )}
        <span className="text-xl font-bold tracking-[-0.04em]">green</span>
      </span>
    </span>
  );
}
