import Link from "next/link";
import { adminHref } from "@/lib/admin-config";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { formatUzs } from "@/lib/format";
import { formatOrderNumber } from "@/lib/orders";
import { ORDER_STATUS_LABEL, ORDER_STATUS_STYLE } from "@/components/admin/order-status";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const TABS = ["receipt_received", "awaiting_payment", "confirmed", "rejected"] as const;

type Props = { searchParams: Promise<{ status?: string; page?: string }> };

export default async function OrdersPage({ searchParams }: Props) {
  const config = await requireAdmin();
  const { status, page: rawPage } = await searchParams;
  const active = (TABS as readonly string[]).includes(status ?? "") ? status : undefined;
  const page = Math.max(1, Math.floor(Number(rawPage)) || 1);

  const where = active ? { status: active } : {};
  const [orders, total, counts] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { id: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const countOf = (value: string) => counts.find((c) => c.status === value)?._count ?? 0;
  const tabHref = (value?: string) => adminHref(config, value ? `?status=${value}` : "");

  return (
    <>
      <h1 className="text-2xl font-extrabold">Заказы</h1>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
        <Link href={tabHref()} className={`rounded-lg border border-line px-3 py-1.5 ${!active ? "bg-raised text-signal" : "text-muted"}`}>Все</Link>
        {TABS.map((tab) => (
          <Link key={tab} href={tabHref(tab)} className={`rounded-lg border border-line px-3 py-1.5 ${active === tab ? "bg-raised text-signal" : "text-muted"}`}>
            {ORDER_STATUS_LABEL[tab]}: {countOf(tab)}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-panel p-8 text-center text-muted" data-testid="no-orders">Заказов нет.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="bg-panel text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Заказ</th>
                <th className="px-3 py-2 font-medium">Дата</th>
                <th className="px-3 py-2 font-medium">Покупатель</th>
                <th className="px-3 py-2 text-right font-medium">Сумма</th>
                <th className="px-3 py-2 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-line" data-order={order.id}>
                  <td className="px-3 py-2">
                    <Link href={adminHref(config, `/orders/${order.id}`)} className="font-mono font-semibold underline hover:text-signal">
                      №{formatOrderNumber(order.id)}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{order.createdAt.toLocaleString("ru-RU", { timeZone: "Asia/Tashkent", dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="px-3 py-2">{order.customerName}<span className="block text-xs text-muted">{order.phone}</span></td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-mono">{formatUzs(Number(order.totalUzs), "ru")}</td>
                  <td className={`px-3 py-2 font-semibold ${ORDER_STATUS_STYLE[order.status] ?? ""}`}>{ORDER_STATUS_LABEL[order.status] ?? order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link className="btn btn-ghost" href={adminHref(config, `?${new URLSearchParams({ ...(active ? { status: active } : {}), page: String(page - 1) })}`)}>Назад</Link> : <span />}
          <span className="text-muted">Страница {page} из {Math.ceil(total / PAGE_SIZE)}</span>
          {page * PAGE_SIZE < total ? <Link className="btn btn-ghost" href={adminHref(config, `?${new URLSearchParams({ ...(active ? { status: active } : {}), page: String(page + 1) })}`)}>Вперёд</Link> : <span />}
        </nav>
      )}
    </>
  );
}
