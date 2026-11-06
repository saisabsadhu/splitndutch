export type Category = {
  id: string;
  label: string;
  icon: string;
  pickable: boolean;
};

/** Ids are stored in the database, so never rename one. Labels can change freely. */
export const CATEGORIES: Category[] = [
  { id: "general", label: "General", icon: "🧾", pickable: true },
  { id: "food", label: "Food & drinks", icon: "🍛", pickable: true },
  { id: "chai", label: "Chai & snacks", icon: "☕", pickable: true },
  { id: "groceries", label: "Groceries", icon: "🛒", pickable: true },
  { id: "rent", label: "Rent & PG", icon: "🏠", pickable: true },
  { id: "utilities", label: "Electricity & water", icon: "💡", pickable: true },
  { id: "internet", label: "Wi-Fi & recharge", icon: "📶", pickable: true },
  { id: "help", label: "Maid & cook", icon: "🧹", pickable: true },
  { id: "transport", label: "Cab, auto & metro", icon: "🛺", pickable: true },
  { id: "fuel", label: "Fuel & tolls", icon: "⛽", pickable: true },
  { id: "travel", label: "Flights & trains", icon: "✈️", pickable: true },
  { id: "stay", label: "Hotels & stays", icon: "🛏️", pickable: true },
  { id: "entertainment", label: "Movies & fun", icon: "🎬", pickable: true },
  { id: "shopping", label: "Shopping", icon: "🛍️", pickable: true },
  { id: "home", label: "Household", icon: "🪴", pickable: true },
  { id: "medical", label: "Medical", icon: "💊", pickable: true },
  { id: "education", label: "Fees & books", icon: "📚", pickable: true },
  { id: "gifts", label: "Gifts & occasions", icon: "🎁", pickable: true },
  { id: "settlement", label: "Payment", icon: "🤝", pickable: false },
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): Category {
  return byId.get(id) ?? CATEGORIES[0];
}

export function isCategory(id: string): boolean {
  return byId.has(id);
}

/** Guess a category from the description so most expenses need zero taps. */
const HINTS: [RegExp, string][] = [
  [/\b(chai|tea|coffee|samosa|snack|maggi|vada|pav|momos?)\b/i, "chai"],
  [/\b(swiggy|zomato|dinner|lunch|breakfast|biryani|pizza|restaurant|dhaba|thali|food|drinks?|beer|bar)\b/i, "food"],
  [/\b(blinkit|zepto|instamart|bigbasket|grocer(y|ies)|kirana|vegetables?|sabzi|milk|dmart)\b/i, "groceries"],
  [/\b(rent|pg|deposit|brokerage|maintenance)\b/i, "rent"],
  [/\b(electricity|bescom|power|water|gas|cylinder|lpg)\b/i, "utilities"],
  [/\b(wifi|wi-fi|internet|broadband|jio|airtel|recharge|dth|netflix|hotstar|prime|spotify)\b/i, "internet"],
  [/\b(maid|cook|didi|bai|cleaner|cleaning|laundry|dhobi|iron)\b/i, "help"],
  [/\b(uber|ola|rapido|auto|cab|taxi|metro|bus|toto)\b/i, "transport"],
  [/\b(petrol|diesel|fuel|toll|fastag|parking)\b/i, "fuel"],
  [/\b(flight|indigo|vistara|train|irctc|tatkal|ticket)\b/i, "travel"],
  [/\b(hotel|hostel|airbnb|oyo|homestay|stay|resort|zostel)\b/i, "stay"],
  [/\b(movie|pvr|inox|concert|party|club|game|bowling)\b/i, "entertainment"],
  [/\b(amazon|flipkart|myntra|shopping|clothes)\b/i, "shopping"],
  [/\b(medicine|pharmacy|doctor|hospital|apollo|1mg)\b/i, "medical"],
  [/\b(fees?|books?|course|exam|stationery|xerox|printout)\b/i, "education"],
  [/\b(gift|birthday|wedding|shagun|cake|anniversary)\b/i, "gifts"],
];

export function guessCategory(description: string): string | null {
  for (const [re, id] of HINTS) if (re.test(description)) return id;
  return null;
}

export const GROUP_TYPES = [
  { id: "trip", label: "Trip", icon: "🧳" },
  { id: "home", label: "Flat / PG", icon: "🏠" },
  { id: "hostel", label: "Hostel & college", icon: "🎓" },
  { id: "couple", label: "Couple", icon: "💞" },
  { id: "office", label: "Office & team", icon: "💼" },
  { id: "event", label: "Wedding / event", icon: "🎉" },
  { id: "other", label: "Other", icon: "✨" },
] as const;

export type GroupType = (typeof GROUP_TYPES)[number]["id"];

export function isGroupType(value: string): value is GroupType {
  return GROUP_TYPES.some((g) => g.id === value);
}

export function groupTypeOf(value: string) {
  return GROUP_TYPES.find((g) => g.id === value) ?? GROUP_TYPES[GROUP_TYPES.length - 1];
}
