import bcrypt from "bcryptjs";
import type Database from "better-sqlite3";
import { addDays, todayISO } from "./dates";
import { addNotification, ensureFriendship, insertExpense } from "./records";

const DEMO_PASSWORD = "demo1234";

type DemoUser = { id: string; name: string; email: string };

const MAYA = "usr_maya";
const ARUN = "usr_arun";
const LENA = "usr_lena";
const SAM = "usr_sam";
const PRIYA = "usr_priya";
const NOAH = "usr_noah";

const HOME = "grp_apartment";
const TRIP = "grp_lisbon";
const DINNERS = "grp_fridays";

export function seedIfEmpty(db: Database.Database) {
  const count = db.prepare(`SELECT COUNT(*) AS n FROM users`).get() as { n: number };
  if (count.n > 0) return;

  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const now = new Date().toISOString();
  const people: DemoUser[] = [
    { id: MAYA, name: "Maya Chen", email: "maya@splitndutch.app" },
    { id: ARUN, name: "Arun Shah", email: "arun@splitndutch.app" },
    { id: LENA, name: "Lena Voss", email: "lena@splitndutch.app" },
    { id: SAM, name: "Sam Okonkwo", email: "sam@splitndutch.app" },
    { id: PRIYA, name: "Priya Nair", email: "priya@splitndutch.app" },
    { id: NOAH, name: "Noah Berg", email: "noah@splitndutch.app" },
  ];

  const insertUser = db.prepare(
    `INSERT INTO users (id, name, email, password_hash, currency, created_at) VALUES (?, ?, ?, ?, 'USD', ?)`,
  );
  const insertGroup = db.prepare(
    `INSERT INTO groups (id, name, type, created_by, simplify, archived, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)`,
  );
  const insertMember = db.prepare(
    `INSERT INTO group_members (group_id, user_id, created_at) VALUES (?, ?, ?)`,
  );

  const tx = db.transaction(() => {
    for (const person of people) insertUser.run(person.id, person.name, person.email, hash, now);

    const friendPairs: [string, string][] = [
      [MAYA, ARUN],
      [MAYA, LENA],
      [MAYA, SAM],
      [MAYA, PRIYA],
      [MAYA, NOAH],
      [ARUN, LENA],
      [ARUN, PRIYA],
      [LENA, PRIYA],
      [SAM, NOAH],
      [ARUN, SAM],
      [ARUN, NOAH],
    ];
    for (const [a, b] of friendPairs) ensureFriendship(db, a, b);

    insertGroup.run(HOME, "Apartment 4B", "home", MAYA, 1, now);
    insertGroup.run(TRIP, "Lisbon weekend", "trip", SAM, 1, now);
    insertGroup.run(DINNERS, "Friday dinners", "other", MAYA, 0, now);

    for (const id of [MAYA, ARUN, LENA, PRIYA]) insertMember.run(HOME, id, now);
    for (const id of [MAYA, SAM, NOAH]) insertMember.run(TRIP, id, now);
    for (const id of [MAYA, ARUN, SAM, NOAH]) insertMember.run(DINNERS, id, now);

    const today = todayISO();
    const monthStart = `${today.slice(0, 7)}-01`;

    const expense = (
      id: string,
      groupId: string | null,
      description: string,
      minor: number,
      category: string,
      date: string,
      createdBy: string,
      payers: [string, number][],
      shares: [string, number][],
      extra?: { notes?: string; splitType?: "equal" | "exact" | "percent" | "shares"; repeat?: "weekly" | "monthly" | "none" },
    ) => {
      insertExpense(db, {
        id,
        groupId,
        description,
        amountMinor: minor,
        currency: "USD",
        category,
        date,
        notes: extra?.notes ?? "",
        splitType: extra?.splitType ?? "equal",
        payers: payers.map(([userId, amount]) => ({ userId, minor: amount })),
        shares: shares.map(([userId, amount]) => ({ userId, minor: amount })),
        repeat: extra?.repeat ?? "none",
        repeatUntil: null,
        createdBy,
      });
    };

    expense("exp_rent", HOME, "November rent", 240000, "rent", monthStart, MAYA, [[MAYA, 240000]], [
      [MAYA, 60000],
      [ARUN, 60000],
      [LENA, 60000],
      [PRIYA, 60000],
    ], { notes: "Due on the 1st. Maya pays the landlord.", repeat: "monthly" });

    expense("exp_power", HOME, "Electricity", 18640, "utilities", addDays(today, -6), ARUN, [[ARUN, 18640]], [
      [MAYA, 4660],
      [ARUN, 4660],
      [LENA, 4660],
      [PRIYA, 4660],
    ]);

    expense("exp_groceries", HOME, "Groceries", 9215, "groceries", addDays(today, -3), LENA, [[LENA, 9215]], [
      [MAYA, 2304],
      [ARUN, 2304],
      [LENA, 2304],
      [PRIYA, 2303],
    ], { notes: "Trader Joe's run. Priya is one cent under so the total matches." });

    expense("exp_internet", HOME, "Internet", 8000, "utilities", addDays(today, -12), PRIYA, [[PRIYA, 8000]], [
      [MAYA, 2000],
      [ARUN, 2000],
      [LENA, 2000],
      [PRIYA, 2000],
    ]);

    expense("exp_cleaner", HOME, "Cleaner", 6000, "home", addDays(today, -16), LENA, [[LENA, 6000]], [
      [MAYA, 1500],
      [ARUN, 1500],
      [LENA, 1500],
      [PRIYA, 1500],
    ], { repeat: "weekly", notes: "Every Thursday morning." });

    expense("exp_airbnb", TRIP, "Alfama apartment", 78000, "travel", addDays(today, -20), MAYA, [[MAYA, 78000]], [
      [MAYA, 26000],
      [SAM, 26000],
      [NOAH, 26000],
    ], { notes: "Three nights. Check-in code is on the booking." });

    expense("exp_flights", TRIP, "Flights", 54000, "travel", addDays(today, -28), SAM, [[SAM, 54000]], [
      [MAYA, 18000],
      [SAM, 18000],
      [NOAH, 18000],
    ]);

    expense("exp_dinner_lx", TRIP, "Time Out Market", 9600, "food", addDays(today, -19), NOAH, [[NOAH, 9600]], [
      [MAYA, 3200],
      [SAM, 3200],
      [NOAH, 3200],
    ]);

    expense("exp_train", TRIP, "Train to Sintra", 4200, "transport", addDays(today, -18), MAYA, [[MAYA, 4200]], [
      [MAYA, 2100],
      [SAM, 2100],
    ], { notes: "Noah stayed in to work." });

    expense("exp_pasta", DINNERS, "Pasta night", 6400, "food", addDays(today, -8), MAYA, [[MAYA, 6400]], [
      [MAYA, 1600],
      [ARUN, 1600],
      [SAM, 1600],
      [NOAH, 1600],
    ]);

    expense("exp_sushi", DINNERS, "Sushi", 11000, "food", addDays(today, -1), SAM, [[SAM, 11000]], [
      [MAYA, 2750],
      [ARUN, 2750],
      [SAM, 2750],
      [NOAH, 2750],
    ]);

    expense("exp_coffee", null, "Coffee and buns", 1800, "food", addDays(today, -2), MAYA, [[MAYA, 1800]], [
      [MAYA, 900],
      [PRIYA, 900],
    ], { notes: "Outside the apartment group, just the two of us." });

    expense(
      "exp_settle_arun",
      HOME,
      "Arun paid Maya",
      40000,
      "settlement",
      addDays(today, -4),
      ARUN,
      [[ARUN, 40000]],
      [[MAYA, 40000]],
      { splitType: "exact", notes: "Venmo, toward rent." },
    );

    db.prepare(
      `INSERT INTO comments (id, expense_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run("cmt_rent", "exp_rent", PRIYA, "I can send my share on Friday.", now);
    db.prepare(
      `INSERT INTO comments (id, expense_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run("cmt_airbnb", "exp_airbnb", NOAH, "The rooftop was worth it.", now);

    addNotification(db, {
      userId: MAYA,
      type: "expense",
      title: "Sam added Sushi",
      body: "Friday dinners · $110.00",
      href: "/expenses/exp_sushi",
    });
    addNotification(db, {
      userId: MAYA,
      type: "comment",
      title: "Priya commented on November rent",
      body: "I can send my share on Friday.",
      href: "/expenses/exp_rent",
    });
    addNotification(db, {
      userId: MAYA,
      type: "settlement",
      title: "Arun recorded a payment",
      body: "Arun paid you $400.00 in Apartment 4B.",
      href: "/expenses/exp_settle_arun",
    });
  });

  tx();
}
