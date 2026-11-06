/**
 * npm run ledger -- export     write data/ledger-sheets/*.csv from the database
 * npm run ledger -- push       export, then git commit + push inside the ledger folder
 * npm run ledger -- restore    load the CSVs into an EMPTY database (add --force to overwrite)
 */
import { getDb } from "../lib/db";
import { exportLedger, importLedger, ledgerDir, pushLedger } from "../lib/ledger";

async function main() {
  const [cmd, ...flags] = process.argv.slice(2);
  const db = getDb();
  if (cmd === "export" || cmd === "push") {
    const res = exportLedger(db);
    for (const r of res) console.log(`${r.table.padEnd(16)} ${r.rows} rows`);
    console.log(`Wrote ${ledgerDir()}`);
    if (cmd === "push") console.log(await pushLedger());
    return;
  }
  if (cmd === "restore") {
    const users = (db.prepare(`SELECT COUNT(*) AS n FROM users`).get() as { n: number }).n;
    if (users > 0 && !flags.includes("--force")) {
      console.error(`The database already has ${users} users. Move data/splitndutch.db aside, or pass --force to merge over it.`);
      process.exit(1);
    }
    const res = importLedger(db);
    for (const r of res) console.log(`${r.table.padEnd(16)} ${r.rows} rows`);
    console.log("Restored. Everyone keeps their password; they just need to log in again.");
    return;
  }
  console.log("Usage: npm run ledger -- export | push | restore [--force]");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
