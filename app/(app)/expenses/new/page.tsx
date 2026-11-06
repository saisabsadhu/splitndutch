import { ExpenseForm } from "@/components/ExpenseForm";
import { requireUser } from "@/lib/auth";
import { listFriends, listGroups, listPeople } from "@/lib/queries";

export const metadata = { title: "Add expense" };

export default function NewExpensePage({ searchParams }: { searchParams: { group?: string; friend?: string } }) {
  const user = requireUser();
  const groups = listGroups(user.id);
  const friends = listFriends(user.id);
  const people = listPeople([user.id, ...friends.map((f) => f.id), ...groups.flatMap((g) => g.memberIds)]);
  const groupId = groups.some((g) => g.id === searchParams.group) ? searchParams.group : undefined;
  const friendId = friends.some((f) => f.id === searchParams.friend) ? searchParams.friend : undefined;
  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">A bill, a ticket, a grocery run</p>
          <h1>Add an expense</h1>
        </div>
      </div>
      <ExpenseForm
        me={{ id: user.id, name: user.name }}
        friends={friends}
        groups={groups.map((g) => ({ id: g.id, name: g.name, memberIds: g.memberIds }))}
        people={people}
        presetGroupId={groupId}
        presetFriendId={friendId}
      />
    </>
  );
}
