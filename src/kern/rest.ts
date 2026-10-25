import Big from "big.js";
import type { Note } from "../schema/index.ts";
import { type ImageCredits, scalingImageCredits } from "./bilder.ts";
import type { ProductionPath } from "./credits.ts";
import { pathPhrase } from "./empfehlung-weg.ts";
import { deNumber } from "./text.ts";

// F7: Wie weit reicht der Credit-Stand? Fertiger Film einschließlich aller Bilder (AC-F7-2).
// Die einmaligen Assets fallen unabhängig von der Filmlänge an und gehen deshalb zuerst vom Credit-Stand ab.

export type Reach = {
  /** Sekunden fertigen Films, die der Credit-Stand trägt (exakt) */
  finishedSeconds: Big;
  /** ganze Clips, die der Credit-Stand trägt */
  clips: Big;
};

export function computeReach(
  path: ProductionPath | undefined,
  images: ImageCredits,
  creditBalance: number,
): { reach: Reach | null; note: Note | null } {
  const scalingImages = scalingImageCredits(images);
  const fixed = images.assets ? images.assets.credits : new Big(0);
  if (!path?.videoCredits || scalingImages === null || fixed === null) return { reach: null, note: null };
  const perFilm = path.videoCredits.plus(scalingImages);
  if (perFilm.eq(0)) return { reach: null, note: null };
  const filmSeconds = path.clips.count.times(path.clips.lengthSeconds);
  const available = new Big(creditBalance).minus(fixed);
  const balance = available.lt(0) ? new Big(0) : available;
  const reach = {
    finishedSeconds: balance.times(filmSeconds).div(perFilm),
    clips: balance.times(path.clips.count).div(perFilm).round(0, Big.roundDown),
  };
  const afterAssets = images.assets
    ? ` nach Abzug von ${deNumber(fixed.round(1).toString())} Credits für die einmaligen Assets`
    : "";
  return {
    reach,
    note: {
      kind: "info",
      text: `Dein Credit-Stand von ${deNumber(creditBalance)} Credits reicht mit ${pathPhrase(path)}${afterAssets} für etwa ${deNumber(reach.finishedSeconds.round(1).toString())} s fertigen Film einschließlich aller Bilder, das sind ${deNumber(reach.clips)} ganze Clips.`,
    },
  };
}
