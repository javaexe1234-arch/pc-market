import { isAdminRequest } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { detectReceiptType } from "@/lib/receipt";
import { readReceipt } from "@/lib/receipt-storage";

const notFound = () => new Response("Not found", { status: 404 });

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (!(await isAdminRequest())) return notFound();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return notFound();

  const order = await prisma.order.findUnique({ where: { id }, select: { receiptFile: true } });
  if (!order?.receiptFile) return notFound();

  const bytes = await readReceipt(order.receiptFile);
  const type = bytes && detectReceiptType(bytes);
  if (!bytes || !type) return notFound();

  return new Response(bytes as Uint8Array<ArrayBuffer>, {
    headers: {
      "Content-Type": type.mime,
      "Content-Disposition": `inline; filename="receipt-${id}.${type.extension}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
