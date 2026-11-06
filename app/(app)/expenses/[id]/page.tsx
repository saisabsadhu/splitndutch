import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentForm } from "@/components/Forms";
import { ConfirmButton } from "@/components/Fields";
import { CategoryDot, Flash } from "@/components/ui";
import { commentDelete, expenseDelete, recurringStop } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { getCategory } from "@/lib/categories";
import { formatDate, formatWhen } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { deltaLabel, payerSummary } from "@/lib/phrases";
import { canSeeExpense, getExpense, getGroup, getPerson, listComments, nameMapFor, toActivity } from "@/lib/queries";

export const metadata = { title: "Expense" };

export default function ExpensePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { notice?: string; error?: string };
}) {
  const user = requireUser();
  const expense = getExpense(params.id);
  if (!expense || !canSeeExpense(user.id, expense)) notFound();
  const names = nameMapFor([expense]);
  const group = expense.groupId ? getGroup(expense.groupId) : null;
  const groupName = new Map(group ? [[group.id, group.name]] : []);
  const item = toActivity(expense, user.id, names, groupName);
  const creator = getPerson(expense.createdBy);
  const comments = listComments(expense.id);
  const splitLabel =
    expense.splitType === "equal"
      ? "Split equally"
      : expense.splitType === "percent"
        ? "Split by percent"
        : expense.splitType === "shares"
          ? "Split by shares"
          : "Split by exact amounts";
  return (
    <>
      <Flash notice={searchParams.notice} error={searchParams.error} />
      <div className="page-head">
        <div>
          <p className="kicker">
            <CategoryDot id={expense.category} /> {getCategory(expense.category).label}
            {group ? ` · ${group.name}` : " · Outside a group"}
          </p>
          <h1>{expense.description}</h1>
        </div>
        <div className="row">
          <Link className="btn ghost" href={`/expenses/${expense.id}/edit`}>
            Edit
          </Link>
          <form action={expenseDelete}>
            <input type="hidden" name="expenseId" value={expense.id} />
            <ConfirmButton label="Delete" message="Delete this expense? Balances will update." />
          </form>
        </div>
      </div>
      <div className="dash">
        <section className="card pad stack">
          <p className="big-money num">{formatMoney(expense.amountMinor, expense.currency)}</p>
          <p>{payerSummary(item.payers, expense.currency)}</p>
          <p className={item.myDelta > 0 ? "pos" : item.myDelta < 0 ? "neg" : "muted"}>
            {deltaLabel(item.isSettlement, item.myDelta, expense.currency)}
          </p>
          <p className="muted">{formatDate(expense.expenseDate)}</p>
          <p className="tiny muted">
            Added by {creator?.name ?? "someone"} · {formatWhen(expense.createdAt)}
          </p>
          {expense.repeatInterval ? (
            <p>
              Repeats {expense.repeatInterval}.{" "}
              <form action={recurringStop} style={{ display: "inline" }}>
                <input type="hidden" name="templateId" value={expense.id} />
                <button className="btn ghost small" type="submit">
                  Stop repeating
                </button>
              </form>
            </p>
          ) : null}
          {expense.notes ? <p>{expense.notes}</p> : null}
          <h2>{splitLabel}</h2>
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {expense.shares.map((share) => (
                <tr key={share.userId}>
                  <td>{share.userId === user.id ? "You" : names.get(share.userId)?.name}</td>
                  <td className="num">
                    {formatMoney(share.minor, expense.currency)}
                    {share.percentBps != null ? ` · ${share.percentBps / 100}%` : ""}
                    {share.shareCount != null ? ` · ${share.shareCount} shares` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card pad">
          <h2>Comments</h2>
          {comments.length === 0 ? <p className="empty">No comments yet.</p> : null}
          {comments.map((comment) => (
            <article key={comment.id} className="comment">
              <strong>{comment.user.id === user.id ? "You" : comment.user.name}</strong>
              <span className="tiny muted"> · {formatWhen(comment.createdAt)}</span>
              <p>{comment.body}</p>
              {comment.user.id === user.id ? (
                <form action={commentDelete}>
                  <input type="hidden" name="commentId" value={comment.id} />
                  <input type="hidden" name="expenseId" value={expense.id} />
                  <button className="btn ghost small" type="submit">
                    Delete
                  </button>
                </form>
              ) : null}
            </article>
          ))}
          <div style={{ height: 12 }} />
          <CommentForm expenseId={expense.id} />
        </section>
      </div>
    </>
  );
}
