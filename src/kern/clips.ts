import Big from "big.js";
import type { Note, Outcome, VideoModel } from "../schema/index.ts";
import { deNumber } from "./text.ts";

// F1: aus dem offenen Umfang (Dauer oder Clips) plus Aufschlag die Clipanzahl und die abgerechneten Sekunden.

export type ClipScope = {
  /** genau eines von `durationSeconds` und `clipCount` */
  durationSeconds?: number;
  clipCount?: number;
  clipLengthSeconds: number;
  extraScenesPercent: number;
};

export type ClipModel = Pick<VideoModel, "name" | "clipMinSeconds" | "clipMaxSeconds">;

export type ClipPlan = {
  /** Clipanzahl einschließlich Aufschlag, aufgerundet */
  count: Big;
  lengthSeconds: Big;
  /** je Versuch abgerechnete Sekunden: Cliplänge, mindestens die Mindestlänge des Modells */
  billedSecondsPerAttempt: Big;
  /** gerechnete Dauer einschließlich Aufschlag */
  openSeconds: Big;
  notes: Note[];
};

export function planClips(scope: ClipScope, model: ClipModel): Outcome<ClipPlan> {
  const length = new Big(scope.clipLengthSeconds);
  if (length.gt(model.clipMaxSeconds)) {
    return {
      ok: false,
      errors: [
        {
          code: "clip-too-long",
          field: "clipLengthSeconds",
          message: `${model.name} erzeugt Clips von höchstens ${deNumber(model.clipMaxSeconds)} s. Wähle eine Cliplänge bis ${deNumber(model.clipMaxSeconds)} s.`,
        },
      ],
    };
  }

  const factor = new Big(1).plus(new Big(scope.extraScenesPercent).div(100));
  let count: Big;
  let openSeconds: Big;
  if (scope.clipCount !== undefined) {
    count = new Big(scope.clipCount).times(factor).round(0, Big.roundUp);
    openSeconds = count.times(length);
  } else if (scope.durationSeconds !== undefined) {
    openSeconds = new Big(scope.durationSeconds).times(factor);
    count = openSeconds.div(length).round(0, Big.roundUp);
  } else {
    return {
      ok: false,
      errors: [
        {
          code: "scope-missing",
          field: "durationSeconds",
          message: "Gib an, was noch offen ist: die Dauer (MM:SS) oder die Zahl der Clips.",
        },
      ],
    };
  }

  const notes: Note[] = [];
  let billedSecondsPerAttempt = length;
  if (length.lt(model.clipMinSeconds)) {
    billedSecondsPerAttempt = new Big(model.clipMinSeconds);
    notes.push({
      kind: "info",
      text: `Clips unter ${deNumber(model.clipMinSeconds)} s rechnet Higgsfield bei ${model.name} mit der Mindestlänge von ${deNumber(model.clipMinSeconds)} s je Versuch ab. Im Schnitt lassen sie sich danach kürzen.`,
    });
  }
  return { ok: true, value: { count, lengthSeconds: length, billedSecondsPerAttempt, openSeconds, notes } };
}
