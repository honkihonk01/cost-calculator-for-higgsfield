// Ergebnis des Abrufs des Credit-Stands aus dem Higgsfield-Konto (App: src/laden/tauri/credits.ts).
// Ganze Credits; schlägt der Abruf fehl, sagt `message` warum, und der Nutzer trägt den Stand von Hand ein.
export type CreditLookup = { ok: true; credits: number } | { ok: false; message: string };
