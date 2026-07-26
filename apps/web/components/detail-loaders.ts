import { cache } from "react";
import {
  getFactionDetail,
  getItemAvailability,
  getItemDetail,
  getNpcDetail,
  getPetDetail,
  getRecipeDetail,
  getSpellDetail,
  getZoneDetail
} from "@eq-alla/data";

/**
 * Detail routes read the same record twice per request: once in
 * `generateMetadata` and once in the page body. Only two service call sites use
 * the Redis/memory cache, so without React's per-request `cache()` every detail
 * page would double its database work just to produce a tab title.
 */
export const loadItemDetail = cache(getItemDetail);
export const loadItemAvailability = cache(getItemAvailability);
export const loadNpcDetail = cache(getNpcDetail);
export const loadSpellDetail = cache(getSpellDetail);
export const loadFactionDetail = cache(getFactionDetail);
export const loadRecipeDetail = cache(getRecipeDetail);
export const loadPetDetail = cache(getPetDetail);
export const loadZoneDetail = cache(getZoneDetail);
