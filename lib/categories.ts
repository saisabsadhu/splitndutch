export type Category = {
  id: string;
  label: string;
  pickable: boolean;
};

export const CATEGORIES: Category[] = [
  { id: "general", label: "General", pickable: true },
  { id: "food", label: "Food & drink", pickable: true },
  { id: "groceries", label: "Groceries", pickable: true },
  { id: "rent", label: "Rent", pickable: true },
  { id: "utilities", label: "Utilities", pickable: true },
  { id: "transport", label: "Transport", pickable: true },
  { id: "travel", label: "Travel", pickable: true },
  { id: "entertainment", label: "Fun", pickable: true },
  { id: "shopping", label: "Shopping", pickable: true },
  { id: "home", label: "Home", pickable: true },
  { id: "medical", label: "Medical", pickable: true },
  { id: "settlement", label: "Settlement", pickable: false },
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): Category {
  return byId.get(id) ?? CATEGORIES[0];
}

export function isCategory(id: string): boolean {
  return byId.has(id);
}

export const GROUP_TYPES = [
  { id: "trip", label: "Trip" },
  { id: "home", label: "Home" },
  { id: "couple", label: "Couple" },
  { id: "other", label: "Other" },
] as const;

export type GroupType = (typeof GROUP_TYPES)[number]["id"];

export function isGroupType(value: string): value is GroupType {
  return GROUP_TYPES.some((g) => g.id === value);
}
