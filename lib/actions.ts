"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, createSession, requireUser } from "./auth";
import { todayISO } from "./dates";
import {
  addComment,
  addFriend,
  addGroupMember,
  archiveGroup,
  authenticate,
  createGroup,
  markAllNotifications,
  markNotification,
  postNextOccurrence,
  registerUser,
  removeComment,
  removeExpense,
  removeFriend,
  removeGroupMember,
  saveExpense,
  settleUp,
  stopRecurring,
  updateGroup,
  updatePassword,
  updateProfile,
} from "./mutations";
import { findUserByEmail } from "./queries";
import type { ExpenseInput } from "./types";

export type FormState = { error: string };

function refresh() {
  revalidatePath("/", "layout");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await authenticate(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  if ("error" in result) return { error: result.error };
  createSession(result.userId);
  redirect("/dashboard");
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await registerUser({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    currency: String(formData.get("currency") ?? "USD"),
  });
  if ("error" in result) return { error: result.error };
  createSession(result.userId);
  redirect("/dashboard");
}

export async function loginDemo() {
  const user = findUserByEmail("maya@splitndutch.app");
  if (!user) redirect("/signup");
  createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  clearSession();
  redirect("/");
}

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = requireUser();
  const result = await updateProfile(user, {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    currency: String(formData.get("currency") ?? user.currency),
  });
  if ("error" in result) return result;
  refresh();
  redirect("/account?notice=Profile+saved");
}

export async function savePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = requireUser();
  const result = await updatePassword(
    user,
    String(formData.get("current") ?? ""),
    String(formData.get("next") ?? ""),
  );
  if ("error" in result) return result;
  redirect("/account?notice=Password+updated");
}

export async function friendAdd(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = requireUser();
  const result = addFriend(user, String(formData.get("email") ?? ""));
  if ("error" in result) return result;
  refresh();
  redirect(`/friends/${result.friendId}`);
}

export async function friendRemove(formData: FormData) {
  const user = requireUser();
  const result = removeFriend(user, String(formData.get("friendId") ?? ""));
  if ("error" in result) redirect(`/friends/${String(formData.get("friendId") ?? "")}?error=${encodeURIComponent(result.error)}`);
  refresh();
  redirect("/friends?notice=Friend+removed");
}

export async function groupCreate(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = requireUser();
  const result = createGroup(user, {
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? "other"),
    emails: String(formData.get("emails") ?? ""),
  });
  if ("error" in result) return result;
  refresh();
  redirect(`/groups/${result.id}`);
}

export async function groupSave(formData: FormData) {
  const user = requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const result = updateGroup(user, groupId, {
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? "other"),
    simplify: formData.get("simplify") === "on",
  });
  if ("error" in result) redirect(`/groups/${groupId}?error=${encodeURIComponent(result.error)}`);
  refresh();
  redirect(`/groups/${groupId}?notice=Group+updated`);
}

export async function groupAddMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const result = addGroupMember(user, groupId, String(formData.get("email") ?? ""));
  if ("error" in result) return result;
  refresh();
  redirect(`/groups/${groupId}?notice=Member+added`);
}

export async function groupRemoveMember(formData: FormData) {
  const user = requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const result = removeGroupMember(user, groupId, String(formData.get("memberId") ?? ""));
  if ("error" in result) redirect(`/groups/${groupId}?error=${encodeURIComponent(result.error)}`);
  refresh();
  redirect(`/groups/${groupId}?notice=Member+removed`);
}

export async function groupArchive(formData: FormData) {
  const user = requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const result = archiveGroup(user, groupId);
  if ("error" in result) redirect(`/groups/${groupId}?error=${encodeURIComponent(result.error)}`);
  refresh();
  redirect("/groups?notice=Group+deleted");
}

export async function expenseSave(input: ExpenseInput & { id?: string }): Promise<FormState & { href?: string }> {
  const user = requireUser();
  const result = saveExpense(user, input, input.id);
  if ("error" in result) return result;
  refresh();
  return { error: "", href: result.href };
}

export async function expenseDelete(formData: FormData) {
  const user = requireUser();
  const result = removeExpense(user, String(formData.get("expenseId") ?? ""));
  if ("error" in result) redirect(`/expenses/${String(formData.get("expenseId") ?? "")}?error=${encodeURIComponent(result.error)}`);
  refresh();
  redirect(result.href);
}

export async function settlementSave(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = requireUser();
  const currency = String(formData.get("currency") ?? user.currency);
  const raw = String(formData.get("amount") ?? "");
  const { parseMoney } = await import("./money");
  const amountMinor = parseMoney(raw, currency);
  if (amountMinor === null || amountMinor <= 0) return { error: "Enter an amount greater than zero." };
  const groupRaw = String(formData.get("groupId") ?? "");
  const result = settleUp(user, {
    fromId: String(formData.get("fromId") ?? ""),
    toId: String(formData.get("toId") ?? ""),
    amountMinor,
    currency,
    date: String(formData.get("date") ?? todayISO()),
    groupId: groupRaw && groupRaw !== "none" ? groupRaw : null,
    note: String(formData.get("note") ?? ""),
  });
  if ("error" in result) return result;
  refresh();
  redirect(result.href ?? "/dashboard");
}

export async function commentAdd(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = requireUser();
  const expenseId = String(formData.get("expenseId") ?? "");
  const result = addComment(user, expenseId, String(formData.get("body") ?? ""));
  if ("error" in result) return result;
  refresh();
  redirect(`/expenses/${expenseId}`);
}

export async function commentDelete(formData: FormData) {
  const user = requireUser();
  const expenseId = String(formData.get("expenseId") ?? "");
  const result = removeComment(user, String(formData.get("commentId") ?? ""));
  if ("error" in result) redirect(`/expenses/${expenseId}?error=${encodeURIComponent(result.error)}`);
  refresh();
  redirect(`/expenses/${expenseId}`);
}

export async function recurringPost(formData: FormData) {
  const user = requireUser();
  const result = postNextOccurrence(user, String(formData.get("templateId") ?? ""));
  const back = String(formData.get("back") ?? "/dashboard");
  if ("error" in result) redirect(`${back}?error=${encodeURIComponent(result.error)}`);
  refresh();
  redirect(`/expenses/${result.id}`);
}

export async function recurringStop(formData: FormData) {
  const user = requireUser();
  const id = String(formData.get("templateId") ?? "");
  const result = stopRecurring(user, id);
  if ("error" in result) redirect(`/expenses/${id}?error=${encodeURIComponent(result.error)}`);
  refresh();
  redirect(`/expenses/${id}?notice=Repeating+stopped`);
}

export async function notificationOpen(formData: FormData) {
  const user = requireUser();
  const result = markNotification(user, String(formData.get("id") ?? ""));
  refresh();
  if ("error" in result) redirect("/dashboard");
  redirect(result.href);
}

export async function notificationsRead() {
  const user = requireUser();
  markAllNotifications(user);
  refresh();
}
