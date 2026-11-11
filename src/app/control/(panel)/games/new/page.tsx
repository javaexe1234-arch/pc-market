import Link from "next/link";
import { GameForm } from "@/components/admin/GameForm";
import { adminHref } from "@/lib/admin-config";
import { requireAdmin } from "@/lib/admin-guard";
import { saveGame } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function NewGamePage() {
  const config = await requireAdmin();
  return (
    <div className="space-y-4">
      <Link href={adminHref(config, "/games")} className="text-sm text-muted hover:text-text">← Игры</Link>
      <h1 className="text-2xl font-extrabold">Новая игра</h1>
      <GameForm action={saveGame} initial={{ active: "on", year: String(new Date().getFullYear()) }} />
    </div>
  );
}
