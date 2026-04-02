type CoinValue = {
  pp: number;
  gp: number;
  sp: number;
  cp: number;
};

function CoinPill({ label, value, src }: { label: string; value: number; src: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">
      <span className="tabular-nums font-semibold text-[#f3e7cf]">{value}</span>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="size-[14px] object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]"
        title={label}
      />
    </span>
  );
}

export function CoinDisplay({ value, className = "" }: { value: CoinValue; className?: string }) {
  const visibleCoins = [
    { label: "PP", value: value.pp, src: "/coins/pp.png" },
    { label: "GP", value: value.gp, src: "/coins/gp.png" },
    { label: "SP", value: value.sp, src: "/coins/sp.png" },
    { label: "CP", value: value.cp, src: "/coins/cp.png" }
  ].filter((coin) => coin.value > 0);

  const coinsToRender = visibleCoins.length > 0 ? visibleCoins : [{ label: "CP", value: 0, src: "/coins/cp.png" }];

  return (
    <div className={`flex flex-wrap items-center gap-2 text-[#f3e7cf] ${className}`.trim()}>
      {coinsToRender.map((coin) => (
        <CoinPill key={coin.label} label={coin.label} value={coin.value} src={coin.src} />
      ))}
    </div>
  );
}
