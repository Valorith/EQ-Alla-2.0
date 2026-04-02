"use client";

import { useEffect, useMemo, useState } from "react";

type NpcModelPreviewProps = {
  appearance: {
    raceId: number;
    gender: number;
    texture: number;
    helmTexture: number;
  };
  npcName: string;
  assetBaseUrl: string;
  fallbackAssetBaseUrls?: string[];
};

const playableRaceIds = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 128, 130, 330, 522]);

function buildNpcModelKey(appearance: NpcModelPreviewProps["appearance"]) {
  let texture = appearance.texture;
  let helmTexture = appearance.helmTexture;

  if (playableRaceIds.has(appearance.raceId)) {
    if (helmTexture > 3) {
      helmTexture = 0;
    }

    if (texture > 16 || (texture > 3 && texture < 10)) {
      texture = 0;
    }
  }

  return `${appearance.raceId}_${appearance.gender}_${texture}_${helmTexture}`;
}

export function NpcModelPreview({ appearance, npcName, assetBaseUrl, fallbackAssetBaseUrls = [] }: NpcModelPreviewProps) {
  const [hidden, setHidden] = useState(false);
  const modelKey = useMemo(() => buildNpcModelKey(appearance), [appearance]);
  const imageUrls = useMemo(
    () =>
      [assetBaseUrl, ...fallbackAssetBaseUrls]
        .filter(Boolean)
        .map((baseUrl) => `${baseUrl}/CTN_${modelKey}.png`),
    [assetBaseUrl, fallbackAssetBaseUrls, modelKey]
  );
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setHidden(false);
    setCurrentImageUrl(null);

    async function resolveImageUrl() {
      for (const imageUrl of imageUrls) {
        const found = await new Promise<boolean>((resolve) => {
          const image = new Image();
          image.onload = () => resolve(true);
          image.onerror = () => resolve(false);
          image.src = imageUrl;
        });

        if (cancelled) {
          return;
        }

        if (found) {
          setCurrentImageUrl(imageUrl);
          return;
        }
      }

      setHidden(true);
    }

    void resolveImageUrl();

    return () => {
      cancelled = true;
    };
  }, [imageUrls]);

  if (hidden) {
    return (
      <div className="rounded-[12px] border border-dashed border-white/12 bg-[linear-gradient(180deg,rgba(17,21,29,0.88),rgba(9,12,18,0.92))] px-4 py-8 text-center text-[15px] leading-6 text-[#aeb8ca]">
        No preview model image was found for this NPC appearance.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(52,66,86,0.3),rgba(10,14,21,0.96)_65%)] px-2 py-3">
      <div className="flex min-h-[320px] items-center justify-center">
        {currentImageUrl ? (
          <img
            src={currentImageUrl}
            alt={`${npcName} model preview`}
            className="h-[210px] max-w-full w-auto object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.55)]"
            loading="lazy"
          />
        ) : (
          <div className="px-4 text-center text-[15px] leading-6 text-[#aeb8ca]">Loading preview model...</div>
        )}
      </div>
    </div>
  );
}
