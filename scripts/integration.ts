/**
 * End-to-end checks against a throwaway database: invites, guests, merging, reminders,
 * tokens, deletion, and a CSV ledger round trip. Run: npm run test:integration
 */
import fs from "fs";
import os from "os";
import path from "path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "snd-test-"));
process.env.DATA_DIR = dir;
process.env.LEDGER_DIR = path.join(dir, "sheets");
process.env.DEMO_MODE = "1";
process.env.RESEND_API_KEY = "";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${message}`);
}

async function main() {
  const log = console.log;
  console.log = () => {}; // silence dev email output
  const { getDb, initSchema } = await import("../lib/db");
  const m = await import("../lib/mutations");
  const q = await import("../lib/queries");
  const { exportLedger, importLedger } = await import("../lib/ledger");
  const { issueToken, peekToken, consumeToken } = await import("../lib/tokens");
  const Database = (await import("better-sqlite3")).default;

  const db = getDb();
  const demo = q.findUserByEmail("ananya@splitndutch.app");
  assert(demo, "demo seeded");
  const session = (id: string) => {
    const u = db.prepare(`SELECT id, name, email, currency, created_at AS createdAt, upi_id AS upiId, email_prefs AS emailPrefs FROM users WHERE id = ?`).get(id) as any;
    return { ...u, verified: true };
  };

  // Signup + login
  const reg = await m.registerUser({ name: "Test Person", email: "test@example.com", password: "password123", currency: "INR" });
  assert("userId" in reg, "register");
  const me = session(reg.userId);
  assert("ok" in (await m.authenticate("TEST@example.com", "password123")), "login case-insensitive");
  assert("error" in (await m.authenticate("test@example.com", "wrong")), "bad password rejected");

  // Group with an unknown email (invited) and a bare name (guest)
  const g = m.createGroup(me, {
    name: "Goa 2026", type: "trip", currency: "INR", destination: "goa", startDate: "2026-12-28", endDate: "2027-01-02", budget: 5000000,
    members: "friend@example.com\nBunty\nPriya <priya@splitndutch.app>",
  });
  assert("id" in g && g.invited === 1, `group created with 1 invite: ${JSON.stringify(g)}`);
  const group = q.getGroup(g.id)!;
  assert(group.memberIds.length === 4 && group.destination === "goa" && group.inviteCode, "members, destination, invite code");
  const invited = q.findUserByEmail("friend@example.com")!;
  assert(invited.status === "invited", "invited status");
  assert("error" in (await m.authenticate("friend@example.com", "")), "invited can't log in yet");
  const guest = q.listPeople(group.memberIds).find((p) => p.name === "Bunty")!;
  assert(guest.status === "guest", "guest status");

  // Expense including guest and invited person
  const ids = group.memberIds;
  const e = m.saveExpense(me, {
    description: "Beach shack", amountMinor: 400000, currency: "INR", category: "food", date: "2026-12-29", notes: "",
    groupId: g.id, splitType: "equal", payers: [{ userId: me.id, minor: 400000 }],
    shares: ids.map((id) => ({ userId: id, minor: 100000 })), repeat: "none", repeatUntil: null,
  });
  assert("id" in e, `expense saved ${JSON.stringify(e)}`);
  assert(q.groupBalance(me.id, g.id)[0]?.minor === 300000, "I'm owed ₹3,000");

  // Reminder: guest refused, invited allowed once per day
  assert("error" in m.remindPayment(me, guest.id, g.id), "can't email a guest");
  assert("ok" in m.remindPayment(me, invited.id, g.id), "remind invited");
  assert("error" in m.remindPayment(me, invited.id, g.id), "reminder rate limit");

  // Guest gets an email that already has an account → merged
  const priya = q.findUserByEmail("priya@splitndutch.app")!;
  const merged = m.inviteGuest(me, guest.id, "priya@splitndutch.app");
  assert("ok" in merged && merged.mergedInto === priya.id, "guest merged into existing account");
  const after = q.getExpense((e as any).id)!;
  assert(after.shares.find((s) => s.userId === priya.id)?.minor === 200000, "merged shares summed");
  assert(after.shares.reduce((s, x) => s + x.minor, 0) === 400000, "expense still balances");
  assert(!q.getPerson(guest.id), "guest row removed");

  // Invite token → set password → active
  const token = issueToken(invited.id, "invite");
  assert(peekToken(token, ["invite"]) && !peekToken(token, ["reset"]), "token kinds");
  const set = await m.setPasswordWithToken(token, "newpassword1", "Friend Name");
  assert("ok" in set, "invite accepted");
  assert(!consumeToken(token, ["invite"]), "token single-use");
  assert("ok" in (await m.authenticate("friend@example.com", "newpassword1")), "invited user can log in");

  // Join by link
  const other = await m.registerUser({ name: "Joiner", email: "joiner@example.com", password: "password123", currency: "INR" });
  assert("userId" in other, "joiner registered");
  const joined = m.joinGroupByCode(session(other.userId), group.inviteCode!);
  assert("id" in joined && q.isMember(g.id, other.userId), "joined by link");
  m.regenerateInviteCode(me, g.id);
  assert(!q.findGroupByInvite(group.inviteCode!), "old invite link dead after reset");

  // Signup with an invited email requires inbox proof
  m.addFriend(me, { email: "pending@example.com", name: "" });
  const claim = await m.registerUser({ name: "Claimer", email: "pending@example.com", password: "password123", currency: "INR" });
  assert("pending" in claim, "invited email needs email link");

  // Account deletion blocked while owing/owed, allowed when settled
  const joinerUser = session(other.userId);
  assert("ok" in (await m.deleteAccount(joinerUser, "password123")), "settled user can delete");
  const gone = q.getPerson(other.userId)!;
  assert(gone.status === "deleted" && gone.name === "Deleted user" && !q.isMember(g.id, other.userId), "anonymised");
  assert("error" in (await m.deleteAccount(me, "password123")), "can't delete with open balances");

  // CSV ledger round trip
  const out = exportLedger(db);
  assert(out.find((t) => t.table === "users")!.rows > 5, "ledger export");
  assert(!fs.existsSync(path.join(process.env.LEDGER_DIR!, "sessions.csv")), "sessions never exported");
  const fresh = new Database(path.join(dir, "restore.db"));
  initSchema(fresh);
  importLedger(fresh, process.env.LEDGER_DIR);
  const count = (d: any, t: string) => (d.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
  for (const t of ["users", "groups", "expenses", "expense_shares", "group_members"]) {
    assert(count(fresh, t) === count(db, t), `restore ${t}`);
  }
  const hash = (d: any) => (d.prepare(`SELECT password_hash FROM users WHERE email = 'test@example.com'`).get() as any).password_hash;
  assert(hash(fresh) === hash(db), "password hash survives restore");

  console.log = log;
  console.log("integration ok");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => fs.rmSync(dir, { recursive: true, force: true }));
