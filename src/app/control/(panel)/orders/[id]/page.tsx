import Link from "next/link";
import { notFound } from "next/navigation";
import { ORDER_STATUS_LABEL, ORDER_STATUS_STYLE } from "@/components/admin/order-status";
import { adminHref } from "@/lib/admin-config";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { formatUzs } from "@/lib/format";
import { formatOrderNumber } from "@/lib/orders";
import { decideOrderAction, resendReceiptAction } from "../../../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> };

const NOTICES: Record<string, { text: string; style: string }> = {
  confirmed: { text: "Оплата подтверждена.", style: "text-good" },
  rejected: { text: "Заказ отклонён, товары возвращены на склад.", style: "text-good" },
  unchanged: { text: "Статус уже изменён, ничего не сделано.", style: "text-warn" },
  resent: { text: "Чек отправлен в Telegram.", style: "text-good" },
  resendFailed: { text: "Не удалось отправить чек в Telegram.", style: "text-danger" },
};

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const config = await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();
  const notice = NOTICES[(await searchParams).notice ?? ""];

  const receiptUrl = adminHref(config, `/receipts/${order.id}?v=${order.receiptAttempts}`);
  const canConfirm = order.status === "awaiting_payment" || order.status === "receipt_received";
  const canReject = order.status !== "rejected";
  const paidByCard = order.paymentMethod === "stripe";
  const stripeMode = process.env.STRIPE_SECRET_KEY?.trim().startsWith("sk_test_") ? "test/" : "";
  const stripePaymentUrl = order.stripePaymentIntent
    ? `https://dashboard.stripe.com/${stripeMode}payments/${order.stripePaymentIntent}`
    : null;

  return (
    <div className="space-y-5">
      <div>
        <Link href={adminHref(config)} className="text-sm text-muted hover:text-text">← Заказы</Link>
        <h1 className="mt-1 text-2xl font-extrabold">Заказ №{formatOrderNumber(order.id)}</h1>
        <p className={`mt-1 font-semibold ${ORDER_STATUS_STYLE[order.status] ?? ""}`} data-testid="admin-order-status">
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </p>
        {notice && <p role="status" className={`mt-1 text-sm ${notice.style}`} data-testid="admin-notice">{notice.text}</p>}
      </div>

      {paidByCard && (
        <section className="rounded-xl border border-good/50 bg-panel p-5" data-testid="admin-paid-by-card">
          <h2 className="font-bold text-good">Оплачено картой через Stripe</h2>
          <p className="mt-1 text-sm">
            {order.paidAt?.toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}
            {stripePaymentUrl && (
              <>
                {" · "}
                <a href={stripePaymentUrl} target="_blank" rel="noreferrer" className="underline">открыть платёж в Stripe</a>
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-muted">Stripe уже проверил оплату, подтверждать её вручную не нужно.</p>
        </section>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-xl border border-line bg-panel p-5">
          <h2 className="font-bold">Чек</h2>
          {!order.receiptFile ? (
            <p className="mt-2 text-sm text-muted">Покупатель ещё не загрузил чек.</p>
          ) : order.receiptMime === "application/pdf" ? (
            <a href={receiptUrl} target="_blank" rel="noreferrer" className="btn btn-ghost mt-3" data-testid="receipt-link">Открыть PDF</a>
          ) : (
            <a href={receiptUrl} target="_blank" rel="noreferrer" className="mt-3 block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={receiptUrl} alt="Чек об оплате" className="max-h-[32rem] rounded-lg border border-line" data-testid="receipt-image" />
            </a>
          )}
          {order.receiptFile && (
            <div className="mt-3 text-sm">
              {order.telegramSentAt ? (
                <p className="text-good">Отправлен в Telegram.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-warn" data-testid="telegram-pending">Не отправлен в Telegram: {order.telegramError ?? "ожидает отправки"}.</p>
                  <form action={resendReceiptAction}>
                    <input type="hidden" name="id" value={order.id} />
                    <button type="submit" className="btn btn-ghost">Отправить ещё раз</button>
                  </form>
                </div>
              )}
            </div>
          )}
          <p className="mt-3 text-xs text-muted">Чек можно подделать. Перед подтверждением сверьте поступление денег в банке.</p>
        </section>

        <section className="space-y-3 rounded-xl border border-line bg-panel p-5">
          <h2 className="font-bold">Решение</h2>
          {canConfirm && (
            <form action={decideOrderAction}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="decision" value="confirmed" />
              <button type="submit" className="btn btn-primary w-full" data-testid="confirm-order">Подтвердить оплату</button>
            </form>
          )}
          {canReject ? (
            <details className="rounded-lg border border-line p-3 text-sm">
              <summary className="cursor-pointer font-semibold" data-testid="reject-open">Отклонить заказ</summary>
              <p className="mt-2 text-muted">Товары вернутся на склад, а покупатель увидит, что оплата не подтверждена. Отменить это нельзя.</p>
              {paidByCard && <p className="mt-2 font-semibold text-warn">Заказ оплачен картой: деньги не вернутся сами, сделайте возврат в панели Stripe.</p>}
              <form action={decideOrderAction} className="mt-2">
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="decision" value="rejected" />
                <button type="submit" className="btn btn-ghost w-full !border-danger !text-danger" data-testid="reject-order">Да, отклонить</button>
              </form>
            </details>
          ) : (
            <p className="text-sm text-muted">Заказ закрыт.</p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-bold">Покупатель</h2>
        <dl className="mt-2 space-y-1 text-sm">
          <div><dt className="inline text-muted">Имя: </dt><dd className="inline">{order.customerName}</dd></div>
          <div><dt className="inline text-muted">Телефон: </dt><dd className="inline">{order.phone}</dd></div>
          <div><dt className="inline text-muted">Адрес: </dt><dd className="inline">{order.address}</dd></div>
          {order.comment && <div><dt className="inline text-muted">Комментарий: </dt><dd className="inline">{order.comment}</dd></div>}
          <div><dt className="inline text-muted">Создан: </dt><dd className="inline">{order.createdAt.toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}</dd></div>
        </dl>
      </section>

      <section className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-bold">Состав</h2>
        <ul className="mt-2 divide-y divide-line text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2">
              <Link href={adminHref(config, `/products/${item.productId}`)} className="hover:text-signal">{item.brand} {item.name} × {item.quantity}</Link>
              <span className="font-mono">{formatUzs(item.priceUzs * item.quantity, "ru")}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex justify-between border-t border-line pt-3 font-semibold">
          <span>Итого</span>
          <span className="font-mono">{formatUzs(Number(order.totalUzs), "ru")}</span>
        </p>
      </section>
    </div>
  );
}
