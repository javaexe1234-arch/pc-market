import Link from "next/link";
import { adminHref } from "@/lib/admin-config";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const config = await requireAdmin();
  const games = await prisma.game.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Игры</h1>
        <Link href={adminHref(config, "/games/new")} className="btn btn-primary" data-testid="new-game">Добавить игру</Link>
      </div>
      <p className="mt-2 text-sm text-muted">Всего: {games.length}. Значения FPS указаны для эталонной сборки на 1080p.</p>

      <div className="mt-3 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[38rem] text-sm">
          <thead className="bg-panel text-left text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Игра</th>
              <th className="px-3 py-2 font-medium">Год</th>
              <th className="px-3 py-2 text-right font-medium">Низкие</th>
              <th className="px-3 py-2 text-right font-medium">Средние</th>
              <th className="px-3 py-2 text-right font-medium">Высокие</th>
              <th className="px-3 py-2 text-right font-medium">Ультра</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id} className={`border-t border-line ${game.active ? "" : "opacity-60"}`} data-game-row={game.slug}>
                <td className="px-3 py-2">
                  <Link href={adminHref(config, `/games/${game.id}`)} className="font-semibold underline hover:text-signal">{game.name}</Link>
                  {!game.active && <span className="ml-2 text-xs text-muted">скрыта</span>}
                </td>
                <td className="px-3 py-2 text-muted">{game.year}</td>
                {[game.fpsLow, game.fpsMedium, game.fpsHigh, game.fpsUltra].map((fps, i) => (
                  <td key={i} className="px-3 py-2 text-right font-mono">{fps}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
