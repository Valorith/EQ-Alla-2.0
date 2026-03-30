type ItemIconProps = {
  icon: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  tooltipItemId?: number;
};

const iconSizes = {
  xs: "size-8 rounded-lg text-[10px]",
  sm: "size-9 rounded-xl text-xs",
  md: "size-12 rounded-2xl text-sm",
  lg: "size-16 rounded-[20px] text-lg"
} as const;

function getRemoteIconSrc(icon: string) {
  return /^\d+$/.test(icon) ? `https://alla.clumsysworld.com/images/icons/item_${icon}.png` : null;
}

export function ItemIcon({ icon, name, size = "md", tooltipItemId }: ItemIconProps) {
  const remoteSrc = getRemoteIconSrc(icon);
  const tooltipProps = tooltipItemId ? { "data-item-tooltip-id": String(tooltipItemId) } : {};

  if (remoteSrc) {
    return (
      <img
        src={remoteSrc}
        alt=""
        aria-hidden="true"
        {...tooltipProps}
        className={`${iconSizes[size]} border border-white/12 bg-black/20 object-cover shadow-[0_10px_24px_rgba(7,10,15,0.16)]`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      {...tooltipProps}
      className={`${iconSizes[size]} flex items-center justify-center border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.06))] font-semibold uppercase text-white shadow-[0_10px_24px_rgba(7,10,15,0.16)]`}
    >
      {name.slice(0, 2)}
    </div>
  );
}
