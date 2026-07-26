/**
 * The three link roles used across the archive. Everything that is a link
 * should pick one of these rather than inventing a fourth.
 *
 * - `entityLinkClass`  in-content links to another record (blue, the classic
 *                      compendium treatment). Use inside prose and bullet lists.
 * - `headingLinkClass` a link that also acts as a group heading (gold), so it
 *                      reads as structure rather than as one more list entry.
 * - `rowLinkClass`     the identity link inside a dense results table, where a
 *                      saturated colour on every row would be noise. Carries a
 *                      hover underline so it is still discoverable.
 */
export const entityLinkClass =
  "font-medium text-[#7ab8ff] underline decoration-[1.5px] underline-offset-2 transition hover:text-[#a7d2ff] hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ab8ff]/35";

export const headingLinkClass =
  "font-semibold text-[#d9c391] underline decoration-[1.5px] underline-offset-2 transition hover:text-[#ecd6a3] hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9c391]/35";

export const rowLinkClass =
  "font-medium text-[#f1e8d6] underline decoration-[#c9a772]/0 underline-offset-2 transition hover:text-[#fff5e2] hover:decoration-[#c9a772]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a772]/40";
