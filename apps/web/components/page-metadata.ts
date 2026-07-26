import type { Metadata } from "next";
import { env } from "@eq-alla/data";

export const siteName = env.EQ_SITE_NAME;

function resolveSiteUrl() {
  try {
    return new URL(env.EQ_SITE_URL);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const siteUrl = resolveSiteUrl();

const descriptionMaxLength = 180;

function trimDescription(description: string) {
  const collapsed = description.replace(/\s+/g, " ").trim();

  if (collapsed.length <= descriptionMaxLength) {
    return collapsed;
  }

  const cut = collapsed.slice(0, descriptionMaxLength);
  const lastSpace = cut.lastIndexOf(" ");

  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.]$/, "")}...`;
}

/**
 * Joins the non-empty parts of a detail summary into a single sentence, so pages
 * can pass through fields that are frequently blank without emitting "  - ".
 */
export function joinDescriptionParts(parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) => (typeof part === "number" ? String(part) : part?.trim()))
    .filter((part): part is string => Boolean(part))
    .join(" - ");
}

export function buildPageMetadata({
  title,
  description,
  path
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const trimmedDescription = trimDescription(description);
  const canonical = new URL(path, siteUrl).toString();

  return {
    title,
    description: trimmedDescription,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName,
      // The template in the root layout does not apply to Open Graph titles.
      title: `${title} | ${siteName}`,
      description: trimmedDescription,
      url: canonical
    },
    twitter: {
      card: "summary",
      title: `${title} | ${siteName}`,
      description: trimmedDescription
    }
  };
}

/**
 * Metadata for a detail route whose record could not be loaded. Keeps the tab
 * title useful instead of falling back to the site-wide default.
 */
export function buildNotFoundMetadata(label: string): Metadata {
  return {
    title: `${label} not found`,
    description: `This ${label.toLowerCase()} is not in the archive.`,
    robots: { index: false, follow: true }
  };
}
