"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, clientKey, createSession, endAllSessions, requireUser } from "./auth";
import { config, safeNext } from "./config";
import { todayISO } from "./dates";
import { getDb } from "./db";
import { scheduleLedgerSync } from "./ledger";
import { evalAmount, parseMoney } from "./money";
import {
  addComment,
  addFriend,
  addGroupMember,
  archiveGroup,
  authenticate,
  createGroup,
  deleteAccount,
  inviteGuest,
  joinGroupByCode,
  markAllNotifications,
  markNotification,
  postNextOccurrence,
  regenerateInviteCode,
  registerUser,
  remindPayment,
  removeComment,
  removeExpense,
  removeFriend,
  removeGroupMember,
  requestPasswordReset,
  resendInvite,
  saveExpense,
  sendVerification,
  setPasswordWithToken,
  settleUp,
  stopRecurring,
  updateGroup,
  updatePassword,
  updateProfile,
} from "./mutations";
import { findUserByEmail } from "./queries";
import { rateLimit } from "./ratelimit";
import { DEMO_EMAIL } from "./seed";
import type { ExpenseInput } from "./types";

export type FormState = { error: string; notice?: string };

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "");

/** Every write ends here: refresh pages and schedule the CSV ledger mirror. */
function changed() {
  revalidatePath("/", "layout");
  scheduleLedgerSync(getDb);
}

function back(path: string, kind: "notice" | "error", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
}

// ———————————————— auth ————————————————

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").trim().toLowerCase();
  if (!rateLimit(`login:${await clientKey()}`, 20, 15 * 60_000) || !rateLimit(`login:${email}`, 8, 15 * 60_000)) {
    return { error: "Too many attempts. Wait 15 minutes, or reset your password." };
  }
  const result = await authenticate(email, str(fd, "password"));
  if ("error" in result) return { error: result.error };
  await createSession(result.userId);
  redirect(safeNext(str(fd, "next")));
}

export async function signup(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit(`signup:${await clientKey()}`, 10, 60 * 60_000)) return { error: "Too many sign-ups from here. Try again later." };
  const result = await registerUser({
    name: str(fd, "name"),
    email: str(fd, "email"),
    password: str(fd, "password"),
    currency: str(fd, "currency") || "INR",
  });
  if ("error" in result) return { error: result.error };
  if ("pending" in result) {
    return { error: "", notice: "Friends already added this email. We've sent you a link to finish setting up. Check your inbox." };
  }
  await createSession(result.userId);
  redirect(safeNext(str(fd, "next"), "/dashboard?welcome=1"));
}

export async function loginDemo() {
  if (!config.demoMode) redirect("/signup");
  const user = findUserByEmail(DEMO_EMAIL);
  if (!user) redirect("/signup");
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await clearSession();
  redirect("/");
}

export async function logoutEverywhere() {
  const user = await requireUser();
  endAllSessions(user.id);
  await clearSession();
  redirect("/login?notice=" + encodeURIComponent("Logged out on every device."));
}

export async function forgotPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").trim().toLowerCase();
  if (!email) return { error: "Enter your email." };
  if (!rateLimit(`forgot:${await clientKey()}`, 10, 60 * 60_000) || !rateLimit(`forgot:${email}`, 3, 60 * 60_000)) {
    return { error: "Too many requests. Try again in an hour." };
  }
  requestPasswordReset(email);
  return { error: "", notice: "If that email has an account, a link is on its way. Check spam too." };
}

export async function setPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit(`setpw:${await clientKey()}`, 20, 15 * 60_000)) return { error: "Too many attempts. Wait a few minutes." };
  const name = fd.has("name") ? str(fd, "name") : undefined;
  const result = await setPasswordWithToken(str(fd, "token"), str(fd, "password"), name);
  if ("error" in result) return { error: result.error };
  await createSession(result.userId);
  changed();
  redirect(safeNext(str(fd, "next"), "/dashboard?welcome=1"));
}

export async function resendVerification() {
  const user = await requireUser();
  if (!rateLimit(`verify:${user.id}`, 3, 60 * 60_000)) back("/account", "error", "We've sent a few already. Check spam, or try in an hour.");
  sendVerification(user.id, user.email, user.name);
  back("/account", "notice", `Confirmation email sent to ${user.email}.`);
}

// ———————————————— account ————————————————

export async function saveProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const result = await updateProfile(user, {
    name: str(fd, "name"),
    email: str(fd, "email"),
    currency: str(fd, "currency") || user.currency,
    upiId: str(fd, "upiId"),
    emailPrefs: Number(str(fd, "emailPrefs") || "1"),
    password: str(fd, "password"),
  });
  if ("error" in result) return result;
  changed();
  back("/account", "notice", result.emailChanged ? "Saved. Confirm your new email from your inbox." : "Profile saved.");
}

export async function savePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const result = await updatePassword(user, str(fd, "current"), str(fd, "next"));
  if ("error" in result) return result;
  back("/account", "notice", "Password updated.");
}

export async function accountDelete(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (str(fd, "confirm").trim().toUpperCase() !== "DELETE") return { error: "Type DELETE to confirm." };
  const result = await deleteAccount(user, str(fd, "password"));
  if ("error" in result) return result;
  await clearSession();
  changed();
  redirect("/?notice=" + encodeURIComponent("Your account was deleted."));
}

// ———————————————— friends ————————————————

export async function friendAdd(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!rateLimit(`invite:${user.id}`, 40, 60 * 60_000)) return { error: "That's a lot of invites. Try again in an hour." };
  const email = str(fd, "email").trim();
  const name = str(fd, "name").trim();
  if (!email && !name) return { error: "Enter an email, or at least a name." };
  const result = addFriend(user, { email, name });
  if ("error" in result) return result;
  changed();
  back(`/friends/${result.friendId}`, "notice", result.invited ? "Added! We emailed them an invite." : "Friend added.");
}

export async function friendRemove(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "friendId");
  const result = removeFriend(user, id);
  if ("error" in result) back(`/friends/${id}`, "error", result.error);
  changed();
  back("/friends", "notice", "Friend removed.");
}

export async function guestInvite(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!rateLimit(`invite:${user.id}`, 40, 60 * 60_000)) return { error: "That's a lot of invites. Try again in an hour." };
  const result = inviteGuest(user, str(fd, "personId"), str(fd, "email"));
  if ("error" in result) return result;
  changed();
  const target = str(fd, "back") || "/friends";
  back(target, "notice", result.mergedInto ? "They already had an account, so their expenses are now linked to it." : "Invite sent.");
}

export async function inviteResend(fd: FormData) {
  const user = await requireUser();
  const target = str(fd, "back") || "/friends";
  const result = resendInvite(user, str(fd, "personId"));
  if ("error" in result) back(target, "error", result.error);
  back(target, "notice", "Invite sent again.");
}

export async function sendReminder(fd: FormData) {
  const user = await requireUser();
  const groupId = str(fd, "groupId") || null;
  const target = str(fd, "back") || "/dashboard";
  const result = remindPayment(user, str(fd, "personId"), groupId);
  if ("error" in result) back(target, "error", result.error);
  back(target, "notice", `Reminder sent to ${result.name}.`);
}

// ———————————————— groups ————————————————

function groupFields(fd: FormData) {
  const currency = str(fd, "currency") || "INR";
  const budgetRaw = str(fd, "budget").trim();
  const budget = budgetRaw ? parseMoney(budgetRaw, currency) : null;
  return {
    name: str(fd, "name"),
    type: str(fd, "type") || "other",
    currency,
    destination: str(fd, "destination"),
    startDate: str(fd, "startDate"),
    endDate: str(fd, "endDate"),
    budget: budgetRaw && budget === null ? -1 : budget,
  };
}

export async function groupCreate(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!rateLimit(`group:${user.id}`, 30, 60 * 60_000)) return { error: "Slow down a little. Try again soon." };
  const result = createGroup(user, { ...groupFields(fd), members: str(fd, "members") });
  if ("error" in result) return result;
  changed();
  back(`/groups/${result.id}`, "notice", result.invited ? `Group created. ${result.invited} invite email${result.invited > 1 ? "s" : ""} sent.` : "Group created. Share the invite link to bring everyone in.");
}

export async function groupSave(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const groupId = str(fd, "groupId");
  const result = updateGroup(user, groupId, { ...groupFields(fd), simplify: fd.get("simplify") === "on" });
  if ("error" in result) return result;
  changed();
  back(`/groups/${groupId}`, "notice", "Group updated.");
}

export async function groupAddMember(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!rateLimit(`invite:${user.id}`, 40, 60 * 60_000)) return { error: "That's a lot of invites. Try again in an hour." };
  const groupId = str(fd, "groupId");
  const email = str(fd, "email").trim();
  const name = str(fd, "name").trim();
  if (!email && !name) return { error: "Enter an email, or at least a name." };
  const result = addGroupMember(user, groupId, { email, name });
  if ("error" in result) return result;
  changed();
  back(`/groups/${groupId}`, "notice", result.invited ? `${result.name} added and invited by email.` : `${result.name} added.`);
}

export async function groupRemoveMember(fd: FormData) {
  const user = await requireUser();
  const groupId = str(fd, "groupId");
  const memberId = str(fd, "memberId");
  const result = removeGroupMember(user, groupId, memberId);
  if ("error" in result) back(`/groups/${groupId}`, "error", result.error);
  changed();
  if (memberId === user.id) back("/groups", "notice", "You left the group.");
  back(`/groups/${groupId}`, "notice", "Member removed.");
}

export async function groupArchive(fd: FormData) {
  const user = await requireUser();
  const groupId = str(fd, "groupId");
  const result = archiveGroup(user, groupId);
  if ("error" in result) back(`/groups/${groupId}`, "error", result.error);
  changed();
  back("/groups", "notice", "Group deleted.");
}

export async function groupResetLink(fd: FormData) {
  const user = await requireUser();
  const groupId = str(fd, "groupId");
  const result = regenerateInviteCode(user, groupId);
  if ("error" in result) back(`/groups/${groupId}`, "error", result.error);
  back(`/groups/${groupId}`, "notice", "New invite link created. The old one no longer works.");
}

export async function groupJoin(fd: FormData) {
  const user = await requireUser();
  const result = joinGroupByCode(user, str(fd, "code"));
  if ("error" in result) back("/groups", "error", result.error);
  changed();
  back(`/groups/${result.id}`, "notice", "You're in! Welcome to the group.");
}

// ———————————————— expenses ————————————————

export async function expenseSave(input: ExpenseInput & { id?: string }): Promise<FormState & { href?: string }> {
  const user = await requireUser();
  const result = saveExpense(user, input, input.id);
  if ("error" in result) return result;
  changed();
  return { error: "", href: result.href };
}

export async function expenseDelete(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "expenseId");
  const result = removeExpense(user, id);
  if ("error" in result) back(`/expenses/${id}`, "error", result.error);
  changed();
  back(result.href, "notice", "Expense deleted.");
}

export async function settlementSave(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const currency = str(fd, "currency") || user.currency;
  const amountMinor = evalAmount(str(fd, "amount"), currency);
  if (amountMinor === null || amountMinor <= 0) return { error: "Enter an amount greater than zero." };
  const groupRaw = str(fd, "groupId");
  const result = settleUp(user, {
    fromId: str(fd, "fromId"),
    toId: str(fd, "toId"),
    amountMinor,
    currency,
    date: str(fd, "date") || todayISO(),
    groupId: groupRaw && groupRaw !== "none" ? groupRaw : null,
    note: str(fd, "note"),
  });
  if ("error" in result) return result;
  changed();
  back(result.href ?? "/dashboard", "notice", "Payment recorded. Balances updated.");
}

export async function commentAdd(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const expenseId = str(fd, "expenseId");
  const result = addComment(user, expenseId, str(fd, "body"));
  if ("error" in result) return result;
  changed();
  redirect(`/expenses/${expenseId}`);
}

export async function commentDelete(fd: FormData) {
  const user = await requireUser();
  const expenseId = str(fd, "expenseId");
  const result = removeComment(user, str(fd, "commentId"));
  if ("error" in result) back(`/expenses/${expenseId}`, "error", result.error);
  changed();
  redirect(`/expenses/${expenseId}`);
}

export async function recurringPost(fd: FormData) {
  const user = await requireUser();
  const result = postNextOccurrence(user, str(fd, "templateId"));
  const target = str(fd, "back") || "/dashboard";
  if ("error" in result) back(target, "error", result.error);
  changed();
  redirect(`/expenses/${result.id}`);
}

export async function recurringStop(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "templateId");
  const result = stopRecurring(user, id);
  if ("error" in result) back(`/expenses/${id}`, "error", result.error);
  changed();
  back(`/expenses/${id}`, "notice", "Repeating stopped.");
}

// ———————————————— notifications ————————————————

export async function notificationOpen(fd: FormData) {
  const user = await requireUser();
  const result = markNotification(user, str(fd, "id"));
  revalidatePath("/", "layout");
  if ("error" in result) redirect("/dashboard");
  redirect(result.href);
}

export async function notificationsRead() {
  const user = await requireUser();
  markAllNotifications(user);
  revalidatePath("/", "layout");
}
