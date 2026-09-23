interface BrandProps {
  label?: string;
  large?: boolean;
}

export function Brand({ label = 'Admin', large = false }: BrandProps) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/brand/molyscan-logo.svg"
        alt=""
        width={large ? 48 : 36}
        height={large ? 48 : 36}
        className="shrink-0 object-contain"
      />
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={`font-display font-semibold tracking-tight text-ink ${large ? 'text-2xl' : 'text-xl'}`}>
          Molyscan
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink-3">
          {label}
        </span>
      </div>
    </div>
  );
}
