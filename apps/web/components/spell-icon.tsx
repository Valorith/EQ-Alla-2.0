type SpellIconProps = {
  icon: string;
  name: string;
  size?: "sm" | "md";
};

const iconSizes = {
  sm: "size-9 rounded-xl text-[10px]",
  md: "size-10 rounded-xl text-xs"
} as const;

function getRemoteSpellIconSrc(icon: string) {
  return /^\d+$/.test(icon) ? `https://alla.clumsysworld.com/images/icons/${icon}.gif` : null;
}

export function SpellIcon({ icon, name, size = "sm" }: SpellIconProps) {
  const remoteSrc = getRemoteSpellIconSrc(icon);

  if (remoteSrc) {
    return (
      <img
        src={remoteSrc}
        alt=""
        aria-hidden="true"
        className={`${iconSizes[size]} border border-white/12 bg-black/20 object-cover shadow-[0_10px_24px_rgba(7,10,15,0.16)]`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${iconSizes[size]} flex items-center justify-center border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.06))] font-semibold uppercase text-white shadow-[0_10px_24px_rgba(7,10,15,0.16)]`}
    >
      {name.slice(0, 2)}
    </div>
  );
}
