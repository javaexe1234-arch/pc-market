export const ORDER_STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Ждёт оплаты",
  receipt_received: "Чек на проверке",
  confirmed: "Оплата подтверждена",
  rejected: "Отклонён",
};

export const ORDER_STATUS_STYLE: Record<string, string> = {
  awaiting_payment: "text-muted",
  receipt_received: "text-warn",
  confirmed: "text-good",
  rejected: "text-danger",
};
