import { calculate } from "../../kern/index.ts";
import type { Inputs, Outcome, PriceData, Result } from "../../schema/index.ts";
import { getExchangeRate, localToday } from "./kurs.ts";

// Gemeinsamer Ablauf für Kommandozeile und MCP-Server: Kurs bestimmen (SPEC Entscheidung 13), dann calculate().

export async function calculateWithRate(
  inputs: Inputs,
  data: PriceData,
  dataDir: string,
): Promise<{ outcome: Outcome<Result>; cacheError?: string }> {
  const lookup = await getExchangeRate({
    dataDir,
    today: localToday(),
    timeoutMs: data.settings.ecbTimeoutMs,
    manualRate: inputs.manualExchangeRate,
  });
  const outcome = calculate(inputs, data, lookup.rate);
  return lookup.cacheError === undefined ? { outcome } : { outcome, cacheError: lookup.cacheError };
}
