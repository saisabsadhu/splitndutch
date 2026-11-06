import { notFound } from "next/navigation";
import { ExpenseForm } from "@/components/ExpenseForm";
import { requireUser } from "@/lib/auth";
import { canSeeExpense, getExpense, listFriends, listGroups, listPeople } from "@/lib/queries";

export const metadata = { title: "Edit expense" };

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const expense = getExpense(id);
  if (!expense || !canSeeExpense(user.id, expense)) notFound();
  const groups = listGroups(user.id);
  const friends = listFriends(user.id);
  const involved = [...expense.payers.map((p) => p.userId), ...expense.shares.map((s) => s.userId), expense.createdBy];
  const people = listPeople([user.id, ...friends.map((f) => f.id), ...groups.flatMap((g) => g.memberIds), ...involved]);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Fix a description, a share, or who paid</p>
          <h1>Edit expense</h1>
        </div>
      </div>
      <ExpenseForm
        me={{ id: user.id, name: user.name }}
        friends={friends}
        groups={groups.map((g) => ({ id: g.id, name: g.name, memberIds: g.memberIds, currency: g.currency }))}
        defaultCurrency={user.currency}
        people={people}
        initial={{
          id: expense.id,
          description: expense.description,
          amountMinor: expense.amountMinor,
          currency: expense.currency,
          category: expense.category,
          date: expense.expenseDate,
          notes: expense.notes,
          groupId: expense.groupId,
          splitType: expense.splitType,
          payers: expense.payers,
          shares: expense.shares,
        }}
      />
    </>
  );
}
