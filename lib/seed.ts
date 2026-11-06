import bcrypt from "bcryptjs";
import type Database from "better-sqlite3";
import { randomBytes } from "crypto";
import { addDays, todayISO } from "./dates";
import { ensureFriendship, insertExpense } from "./records";

export const DEMO_EMAIL = "ananya@splitndutch.app";
export const DEMO_PASSWORD = "demo1234";

const ANANYA = "usr_ananya";
const ROHAN = "usr_rohan";
const KABIR = "usr_kabir";
const PRIYA = "usr_priya";
const ZOYA = "usr_zoya";
const DEV = "usr_dev";
const BUNTY = "usr_bunty";

const FLAT = "grp_flat";
const SIKKIM = "grp_sikkim";
const CHAI = "grp_chai";

/** Demo household, only created when DEMO_MODE is on and the database is empty. */
export function seedIfEmpty(db: Database.Database) {
  const count = db.prepare(`SELECT COUNT(*) AS n FROM users`).get() as { n: number };
  if (count.n > 0) return;

  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const now = new Date().toISOString();
  const people = [
    { id: ANANYA, name: "Ananya Iyer", email: DEMO_EMAIL, upi: "ananya@okicici" },
    { id: ROHAN, name: "Rohan Mehta", email: "rohan@splitndutch.app", upi: "rohan@ybl" },
    { id: KABIR, name: "Kabir Singh", email: "kabir@splitndutch.app", upi: "" },
    { id: PRIYA, name: "Priya Nair", email: "priya@splitndutch.app", upi: "priya@okaxis" },
    { id: ZOYA, name: "Zoya Khan", email: "zoya@splitndutch.app", upi: "zoya@paytm" },
    { id: DEV, name: "Dev Patel", email: "dev@splitndutch.app", upi: "" },
  ];

  const tx = db.transaction(() => {
    const insertUser = db.prepare(
      `INSERT INTO users (id, name, email, password_hash, currency, created_at, status, upi_id, email_verified_at)
       VALUES (?, ?, ?, ?, 'INR', ?, 'active', ?, ?)`,
    );
    for (const p of people) insertUser.run(p.id, p.name, p.email, hash, now, p.upi, now);
    // A friend with no email yet, added by name only.
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, currency, created_at, status) VALUES (?, ?, ?, '', 'INR', ?, 'guest')`,
    ).run(BUNTY, "Bunty", "guest-bunty@guest.invalid", now);

    for (const [a, b] of [
      [ANANYA, ROHAN], [ANANYA, KABIR], [ANANYA, PRIYA], [ANANYA, ZOYA], [ANANYA, DEV],
      [ROHAN, KABIR], [ROHAN, PRIYA], [KABIR, PRIYA], [ZOYA, DEV], [ANANYA, BUNTY], [ZOYA, BUNTY], [DEV, BUNTY],
    ]) ensureFriendship(db, a, b);

    const today = todayISO();
    const group = db.prepare(
      `INSERT INTO groups (id, name, type, created_by, simplify, archived, created_at, currency, invite_code, destination, start_date, end_date, budget_minor)
       VALUES (?, ?, ?, ?, 1, 0, ?, 'INR', ?, ?, ?, ?, ?)`,
    );
    group.run(FLAT, "Flat 302, Koramangala", "home", ANANYA, now, randomBytes(6).toString("base64url"), "", null, null, null);
    group.run(SIKKIM, "Sikkim road trip", "trip", ZOYA, now, randomBytes(6).toString("base64url"), "sikkim", addDays(today, -2), addDays(today, 4), 6000000);
    group.run(CHAI, "Office chai gang", "office", ANANYA, now, randomBytes(6).toString("base64url"), "", null, null, null);

    const member = db.prepare(`INSERT INTO group_members (group_id, user_id, created_at) VALUES (?, ?, ?)`);
    for (const id of [ANANYA, ROHAN, KABIR, PRIYA]) member.run(FLAT, id, now);
    for (const id of [ANANYA, ZOYA, DEV, BUNTY]) member.run(SIKKIM, id, now);
    for (const id of [ANANYA, ROHAN, ZOYA, DEV]) member.run(CHAI, id, now);

    const monthStart = `${today.slice(0, 7)}-01`;
    const add = (
      id: string,
      groupId: string | null,
      description: string,
      rupees: number,
      category: string,
      date: string,
      by: string,
      payers: [string, number][],
      sharedBy: string[],
      extra: { notes?: string; repeat?: "monthly" | "weekly" } = {},
    ) => {
      const minor = Math.round(rupees * 100);
      const base = Math.floor(minor / sharedBy.length);
      const shares = sharedBy.map((userId, i) => ({ userId, minor: base + (i < minor - base * sharedBy.length ? 1 : 0) }));
      insertExpense(db, {
        id,
        groupId,
        description,
        amountMinor: minor,
        currency: "INR",
        category,
        date,
        notes: extra.notes ?? "",
        splitType: "equal",
        payers: payers.map(([userId, r]) => ({ userId, minor: Math.round(r * 100) })),
        shares,
        repeat: extra.repeat ?? "none",
        repeatUntil: null,
        createdBy: by,
      });
    };

    const flat = [ANANYA, ROHAN, KABIR, PRIYA];
    add("exp_rent", FLAT, "Rent", 64000, "rent", monthStart, ANANYA, [[ANANYA, 64000]], flat, {
      notes: "Owner's UPI gets it on the 1st. Ananya pays.",
      repeat: "monthly",
    });
    add("exp_bescom", FLAT, "BESCOM electricity", 3280, "utilities", addDays(today, -6), ROHAN, [[ROHAN, 3280]], flat);
    add("exp_cook", FLAT, "Cook didi", 8000, "help", addDays(today, -10), PRIYA, [[PRIYA, 8000]], flat, { repeat: "monthly" });
    add("exp_wifi", FLAT, "ACT Fibernet", 1179, "internet", addDays(today, -12), KABIR, [[KABIR, 1179]], flat);
    add("exp_blinkit", FLAT, "Blinkit groceries", 2146, "groceries", addDays(today, -2), ANANYA, [[ANANYA, 2146]], flat);

    const trip = [ANANYA, ZOYA, DEV, BUNTY];
    add("exp_flights", SIKKIM, "IndiGo BLR → Bagdogra", 26400, "travel", addDays(today, -20), ZOYA, [[ZOYA, 26400]], trip);
    add("exp_innova", SIKKIM, "Innova for 6 days", 24000, "transport", addDays(today, -2), DEV, [[DEV, 12000], [ANANYA, 12000]], trip, {
      notes: "Driver: Pemba. Includes North Sikkim permit fees.",
    });
    add("exp_homestay", SIKKIM, "Lachung homestay", 9600, "stay", addDays(today, -1), ANANYA, [[ANANYA, 9600]], trip);
    add("exp_momos", SIKKIM, "Momos & thukpa at MG Marg", 1240, "food", addDays(today, -2), BUNTY, [[BUNTY, 1240]], trip);

    add("exp_chai", CHAI, "Chai & samosa", 360, "chai", addDays(today, -1), ROHAN, [[ROHAN, 360]], [ANANYA, ROHAN, ZOYA, DEV], { repeat: "weekly" });
    add("exp_cake", CHAI, "Dev's birthday cake", 1450, "gifts", addDays(today, -8), ZOYA, [[ZOYA, 1450]], [ANANYA, ROHAN, ZOYA]);
    add("exp_coffee", null, "Third Wave coffee", 640, "chai", addDays(today, -3), ANANYA, [[ANANYA, 640]], [ANANYA, PRIYA]);

    insertExpense(db, {
      id: "exp_settle_rohan",
      groupId: FLAT,
      description: "Rohan paid Ananya",
      amountMinor: 1000000,
      currency: "INR",
      category: "settlement",
      date: addDays(today, -4),
      notes: "UPI",
      splitType: "exact",
      payers: [{ userId: ROHAN, minor: 1000000 }],
      shares: [{ userId: ANANYA, minor: 1000000 }],
      repeat: "none",
      repeatUntil: null,
      createdBy: ROHAN,
    });

    const comment = db.prepare(`INSERT INTO comments (id, expense_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)`);
    comment.run("cmt_rent", "exp_rent", PRIYA, "Sending mine on Friday after salary 🙏", now);
    comment.run("cmt_innova", "exp_innova", ZOYA, "Pemba bhaiya was the best. Tip him on the last day!", now);

    // Seeded without email: these are demo addresses.
    const note = db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, href, read_at, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    );
    note.run("ntf_1", ANANYA, "expense", "Dev added Innova for 6 days", "Sikkim road trip · ₹24,000", "/expenses/exp_innova", now);
    note.run("ntf_2", ANANYA, "comment", "Priya commented on Rent", "Sending mine on Friday after salary 🙏", "/expenses/exp_rent", now);
    note.run("ntf_3", ANANYA, "settlement", "Rohan recorded a payment", "Rohan paid you ₹10,000 in Flat 302.", "/expenses/exp_settle_rohan", now);
  });

  tx();
}
