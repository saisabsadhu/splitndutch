import { getCurrentUser } from "@/lib/auth";
import { exportAccount } from "@/lib/mutations";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Log in first", { status: 401 });
  return new Response(JSON.stringify(exportAccount(user), null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="splitndutch-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
