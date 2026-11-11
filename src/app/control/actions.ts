"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { adminConfig, adminHref } from "@/lib/admin-config";
import { requireAdmin } from "@/lib/admin-guard";
import { createSession, passwordMatches, SESSION_COOKIE, SESSION_HOURS } from "@/lib/admin-session";
import { parseGameForm, parsePrice, parseProductForm, parseStock, slugify } from "@/lib/admin-validation";
import { prisma } from "@/lib/db";
import { decideOrder, OrderDecision } from "@/lib/orders";
import { allowRequest } from "@/lib/rate-limit";
import { deliverReceipt } from "@/lib/receipt-delivery";
import type { FormErrors, FormValues } from "@/lib/spec-schema";
import { Slot, SLOTS } from "@/lib/specs";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGINS_PER_IP = 5;
/** Also limits guessing from many addresses, or with a faked address header. */
const LOGINS_TOTAL = 30;

export interface FormState {
  attempt: number;
  errors: FormErrors;
  values?: FormValues;
  message?: string;
}

export async function login(_state: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const config = adminConfig();
  if (!config) notFound();

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const allowedForIp = allowRequest(`login:${ip}`, LOGINS_PER_IP, LOGIN_WINDOW_MS);
  const allowedTotal = allowRequest("login:all", LOGINS_TOTAL, LOGIN_WINDOW_MS);
  if (!allowedForIp || !allowedTotal) return { error: "Слишком много попыток. Подождите 15 минут." };

  if (!passwordMatches(String(form.get("password") ?? ""), config)) return { error: "Неверный пароль." };

  (await cookies()).set(SESSION_COOKIE, createSession(config), {
    httpOnly: true,
    sameSite: "strict",
    secure: requestHeaders.get("x-forwarded-proto") === "https",
    path: `/${config.path}`,
    maxAge: SESSION_HOURS * 3600,
  });
  redirect(adminHref(config));
}

export async function logout() {
  const config = await requireAdmin();
  (await cookies()).set(SESSION_COOKIE, "", { path: `/${config.path}`, maxAge: 0 });
  redirect(adminHref(config, "/login"));
}

const positiveId = (value: FormDataEntryValue | null) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function decideOrderAction(form: FormData) {
  const config = await requireAdmin();
  const id = positiveId(form.get("id"));
  const decision = form.get("decision");
  if (!id || (decision !== "confirmed" && decision !== "rejected")) notFound();
  const changed = await decideOrder(id, decision as OrderDecision);
  revalidatePath(adminHref(config));
  redirect(adminHref(config, `/orders/${id}?notice=${changed ? decision : "unchanged"}`));
}

export async function resendReceiptAction(form: FormData) {
  const config = await requireAdmin();
  const id = positiveId(form.get("id"));
  if (!id) notFound();
  const delivered = await deliverReceipt(id);
  redirect(adminHref(config, `/orders/${id}?notice=${delivered ? "resent" : "resendFailed"}`));
}

const listQuery = (form: FormData) => {
  const params = new URLSearchParams();
  const category = String(form.get("category") ?? "");
  const q = String(form.get("q") ?? "");
  if ((SLOTS as readonly string[]).includes(category)) params.set("category", category);
  if (q) params.set("q", q);
  return params;
};

/** The price and stock row in the product list. */
export async function quickUpdateProduct(form: FormData) {
  const config = await requireAdmin();
  const id = positiveId(form.get("id"));
  if (!id) notFound();
  const params = listQuery(form);
  const priceUzs = parsePrice(String(form.get("priceUzs") ?? ""));
  const stock = parseStock(String(form.get("stock") ?? ""));
  if (priceUzs === null || stock === null) {
    params.set("error", String(id));
  } else {
    await prisma.product.update({ where: { id }, data: { priceUzs, stock } });
    params.set("saved", String(id));
  }
  redirect(adminHref(config, `/products?${params}`));
}

const formValues = (form: FormData): FormValues => {
  const values: FormValues = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const all = form.getAll(key).map(String);
    values[key] = all.length > 1 ? all : all[0];
  }
  return values;
};

const isUniqueError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

export async function saveProduct(state: FormState, form: FormData): Promise<FormState> {
  const config = await requireAdmin();
  const id = positiveId(form.get("id"));
  const values = formValues(form);
  const attempt = state.attempt + 1;

  let slot: Slot;
  let categoryId: number;
  if (id) {
    const existing = await prisma.product.findUnique({ where: { id }, include: { category: true } });
    if (!existing) notFound();
    slot = existing.category.slug as Slot;
    categoryId = existing.categoryId;
  } else {
    const requested = String(form.get("slot") ?? "");
    if (!(SLOTS as readonly string[]).includes(requested)) notFound();
    slot = requested as Slot;
    const category = await prisma.category.findUnique({ where: { slug: slot } });
    if (!category) notFound();
    categoryId = category.id;
  }

  const { data, errors } = parseProductForm(slot, values);
  if (!data) return { attempt, errors, values };
  const { specs, ...fields } = data;
  const specsJson = specs as Prisma.InputJsonObject;

  let savedId = id;
  if (id) {
    await prisma.product.update({ where: { id }, data: { ...fields, specs: specsJson } });
  } else {
    try {
      const created = await prisma.product.create({
        data: { ...fields, specs: specsJson, categoryId, slug: slugify(`${fields.brand}-${fields.name}`) },
      });
      savedId = created.id;
    } catch (error) {
      if (!isUniqueError(error)) throw error;
      return { attempt, errors: { name: "Товар с таким брендом и названием уже есть." }, values };
    }
  }
  redirect(adminHref(config, `/products/${savedId}?saved=1`));
}

export async function saveGame(state: FormState, form: FormData): Promise<FormState> {
  const config = await requireAdmin();
  const id = positiveId(form.get("id"));
  const values = formValues(form);
  const attempt = state.attempt + 1;

  const { data, errors } = parseGameForm(values);
  if (!data) return { attempt, errors, values };

  let savedId = id;
  try {
    if (id) {
      await prisma.game.update({ where: { id }, data });
    } else {
      savedId = (await prisma.game.create({ data: { ...data, slug: slugify(data.name) || `game-${Date.now()}` } })).id;
    }
  } catch (error) {
    if (!isUniqueError(error)) throw error;
    return { attempt, errors: { name: "Такая игра уже есть." }, values };
  }
  redirect(adminHref(config, `/games/${savedId}?saved=1`));
}
