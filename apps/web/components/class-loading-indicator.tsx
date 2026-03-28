"use client";

import { useEffect, useState } from "react";

const animatedClassIcons = [
  "/assets/icons/bard.gif",
  "/assets/icons/beastlord.gif",
  "/assets/icons/berserker.gif",
  "/assets/icons/cleric.gif",
  "/assets/icons/druid.gif",
  "/assets/icons/enchanter.gif",
  "/assets/icons/magician.gif",
  "/assets/icons/monk.gif",
  "/assets/icons/necromancer.gif",
  "/assets/icons/paladin.gif",
  "/assets/icons/ranger.gif",
  "/assets/icons/rogue.gif",
  "/assets/icons/shadowknight.gif",
  "/assets/icons/shaman.gif",
  "/assets/icons/warrior.gif",
  "/assets/icons/wizard.gif"
];

function getRandomAnimatedClassIcon() {
  return animatedClassIcons[Math.floor(Math.random() * animatedClassIcons.length)] ?? animatedClassIcons[0];
}

export function ClassLoadingIndicator({
  message = "Loading matching items...",
  detail = "Scanning the archive for the next drop."
}: {
  message?: string;
  detail?: string;
}) {
  const [classIcon, setClassIcon] = useState(animatedClassIcons[0] ?? "/assets/icons/warrior.gif");

  useEffect(() => {
    setClassIcon(getRandomAnimatedClassIcon());
  }, []);

  return (
    <div className="rounded-[28px] border border-[#7b603b]/30 bg-[linear-gradient(180deg,rgba(34,29,24,0.88),rgba(16,18,23,0.88))] px-6 py-8 text-center shadow-[0_22px_52px_rgba(0,0,0,0.28)]">
      <div aria-live="polite" className="flex flex-col items-center gap-4">
        <div className="relative flex size-36 items-center justify-center sm:size-40">
          <div
            aria-hidden="true"
            className="absolute inset-3 rounded-full animate-pulse"
            style={{
              background: "radial-gradient(circle, rgba(56,189,248,0.2) 0%, rgba(56,189,248,0.08) 50%, transparent 70%)"
            }}
          />
          <img
            src={classIcon}
            alt="Animated class loading icon"
            className="relative z-10 h-28 w-auto object-contain drop-shadow-[0_0_16px_rgba(188,230,255,0.6)] sm:h-32"
          />
        </div>

        <div className="space-y-2">
          <p className="font-[var(--font-display)] text-xl font-semibold tracking-[-0.03em] text-[#f4ebdb]">{message}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e2e8f0] animate-pulse">{detail}</p>
        </div>
      </div>
    </div>
  );
}
