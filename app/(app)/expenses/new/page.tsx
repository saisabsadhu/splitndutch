import { ExpenseForm } from "@/components/ExpenseForm";
import { requireUser } from "@/lib/auth";
import { listFriends, listGroups, listPeople } from "@/lib/queries";

export const metadata = { title: "Add expense" };

export default async function NewExpensePage({ searchParams }: { searchParams: Promise<{ group?: string; friend?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const groups = listGroups(user.id);
  const friends = listFriends(user.id);
  const people = listPeople([user.id, ...friends.map((f) => f.id), ...groups.flatMap((g) => g.memberIds)]);
  const groupId = groups.some((g) => g.id === sp.group) ? sp.group : undefined;
  const friendId = friends.some((f) => f.id === sp.friend) ? sp.friend : undefined;
  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Chai, cabs, rent or a whole trip</p>
          <h1>Add an expense</h1>
        </div>
      </div>
      <ExpenseForm
        me={{ id: user.id, name: user.name }}
        friends={friends}
        groups={groups.map((g) => ({ id: g.id, name: g.name, memberIds: g.memberIds, currency: g.currency }))}
        defaultCurrency={user.currency}
        people={people}
        presetGroupId={groupId}
        presetFriendId={friendId}
      />
    </>
  );
}
