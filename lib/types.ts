/** status: active · invited (email, no password yet) · guest (name only) · deleted */
export type Person = { id: string; name: string; email: string; status?: string; upiId?: string };

export type MoneyLine = { currency: string; minor: number };

export type SessionUser = Person & {
  currency: string;
  createdAt: string;
  upiId: string;
  /** 0 none, 1 important, 2 everything */
  emailPrefs: number;
  verified: boolean;
};

export type GroupRecord = {
  id: string;
  name: string;
  type: string;
  createdBy: string;
  simplify: boolean;
  archived: boolean;
  createdAt: string;
  currency: string;
  inviteCode: string | null;
  budgetMinor: number | null;
  destination: string;
  startDate: string | null;
  endDate: string | null;
};

export type ExpenseRecord = {
  id: string;
  groupId: string | null;
  description: string;
  amountMinor: number;
  currency: string;
  category: string;
  expenseDate: string;
  notes: string;
  splitType: "equal" | "exact" | "percent" | "shares";
  repeatInterval: "weekly" | "monthly" | null;
  seriesId: string | null;
  repeatUntil: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  payers: { userId: string; minor: number }[];
  shares: { userId: string; minor: number; percentBps: number | null; shareCount: number | null }[];
};

export type ExpenseInput = {
  description: string;
  amountMinor: number;
  currency: string;
  category: string;
  date: string;
  notes: string;
  groupId: string | null;
  splitType: "equal" | "exact" | "percent" | "shares";
  payers: { userId: string; minor: number }[];
  shares: { userId: string; minor: number; percentBps?: number | null; shareCount?: number | null }[];
  repeat: "none" | "weekly" | "monthly";
  repeatUntil: string | null;
};

export type ActivityItem = {
  id: string;
  date: string;
  createdAt: string;
  description: string;
  category: string;
  currency: string;
  minor: number;
  group: { id: string; name: string } | null;
  payers: { id: string; name: string; minor: number }[];
  shares: { id: string; name: string; minor: number }[];
  isSettlement: boolean;
  myDelta: number;
  splitType: string;
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};

export type RecurringDue = {
  templateId: string;
  description: string;
  currency: string;
  minor: number;
  group: { id: string; name: string } | null;
  nextDate: string;
  waiting: number;
};
