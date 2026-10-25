import { localToday } from "../laden/gemeinsam/index.ts";
import {
  appProjectIo,
  cachedRateFromApp,
  creditsFromApp,
  DATA_DIR_LABEL,
  exchangeRateFromApp,
  loadPricesFromApp,
} from "../laden/tauri/index.ts";
import type { DataSource } from "./quelle.ts";

export const tauriSource: DataSource = {
  dataDirLabel: DATA_DIR_LABEL,
  loadPrices: loadPricesFromApp,
  cachedRate: cachedRateFromApp,
  exchangeRate: exchangeRateFromApp,
  creditBalance: creditsFromApp,
  projects: appProjectIo,
  today: () => localToday(),
  now: () => new Date().toISOString(),
};
