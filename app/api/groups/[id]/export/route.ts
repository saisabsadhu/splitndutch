import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { getCategory } from "@/lib/categories";
import { moneyToInput } from "@/lib/money";
import { groupDetail, loadVisibleExpenses } from "@/lib/queries";

function cell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = requireUser();
  const data = groupDetail(user.id, params.id);
  if (!data) return new Response("Not found", { status: 404 });
  const notes = new Map(
    loadVisibleExpenses(user.id)
      .filter((expense) => expense.groupId === data.group.id)
      .map((expense) => [expense.id, expense.notes]),
  );
  const header = ["Date", "Description", "Category", "Currency", "Amount", "Paid by", "Shares", "Notes"];
  const lines = data.activity.map((item) =>
    [
      formatDate(item.date),
      item.description,
      getCategory(item.category).label,
      item.currency,
      moneyToInput(item.minor, item.currency),
      item.payers.map((p) => `${p.name} ${moneyToInput(p.minor, item.currency)}`).join("; "),
      item.shares.map((s) => `${s.name} ${moneyToInput(s.minor, item.currency)}`).join("; "),
      notes.get(item.id) ?? "",
    ]
      .map(cell)
      .join(","),
  );
  const body = [header.join(","), ...lines].join("\n");
  const filename = `${data.group.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "group"}.csv`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
