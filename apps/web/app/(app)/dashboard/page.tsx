import { getCurrentUser } from "@/lib/auth";
import { Terminal } from "@/components/Terminal";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  return <Terminal initialSymbol={user?.prefs.defaultSymbol || "EURUSD"} />;
}
