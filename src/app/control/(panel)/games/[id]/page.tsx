import Link from "next/link";
import { notFound } from "next/navigation";
import { GameForm } from "@/components/admin/GameForm";
import { adminHref } from "@/lib/admin-config";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { saveGame } from "../../../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> };

export default async function EditGamePage({ params, searchParams }: Props) {
  const config = await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) notFound();
  const saved = (await searchParams).saved;

  const { id: _id, slug: _slug, active, ...numbers } = game;
  const initial = Object.fromEntries(Object.entries(numbers).map(([key, value]) => [key, String(value)]));

  return (
    <div className="space-y-4">
      <Link href={adminHref(config, "/games")} className="text-sm text-muted hover:text-text">← Игры</Link>
      <div>
        <h1 className="text-2xl font-extrabold">{game.name}</h1>
        {saved && <p role="status" className="mt-1 text-sm text-good" data-testid="admin-notice">Сохранено.</p>}
      </div>
      <GameForm action={saveGame} id={game.id} initial={{ ...initial, active: active ? "on" : undefined }} />
    </div>
  );
}
