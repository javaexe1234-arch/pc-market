"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Build, candidateIssues } from "@/lib/compatibility";
import { formatUzs } from "@/lib/format";
import { keySpecs } from "@/lib/part-format";
import type { Part, Slot } from "@/lib/specs";
import { useSpecTranslators } from "../useFormatters";

interface Props {
  slot: Slot;
  parts: Part[];
  build: Build;
  onPick: (part: Part) => void;
  onClose: () => void;
}

export function PartPicker({ slot, parts, build, onPick, onClose }: Props) {
  const t = useTranslations("builder");
  const tSlots = useTranslations("slots");
  const tCompat = useTranslations("compat");
  const locale = useLocale();
  const specT = useSpecTranslators();
  const dialog = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const candidates = useMemo(
    () =>
      parts
        .filter((p) => slot !== "storage" || !build.storage.some((d) => d.id === p.id))
        .map((part) => ({ part, issues: candidateIssues(build, part) })),
    [parts, slot, build],
  );
  const fitCount = candidates.filter((c) => c.issues.length === 0).length;
  const needle = search.trim().toLowerCase();
  const visible = candidates.filter(
    ({ part, issues }) =>
      (showAll || issues.length === 0) && (!needle || `${part.brand} ${part.name}`.toLowerCase().includes(needle)),
  );

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
      className="m-auto h-[min(85vh,48rem)] w-[min(calc(100vw-2rem),44rem)] rounded-xl border border-line bg-panel text-text"
    >
      <div className="flex h-full flex-col">
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{t("pickerTitle", { slot: tSlots(slot) })}</h2>
            <button type="button" className="btn btn-ghost" onClick={onClose}>{t("close")}</button>
          </div>
          <input
            type="search"
            aria-label={t("search")}
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted">{t("fitCount", { fit: fitCount, total: candidates.length })}</span>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                className="h-4 w-4 accent-signal"
              />
              {t("showAll")}
            </label>
          </div>
        </div>

        <ul className="flex-1 space-y-2 overflow-y-auto p-4">
          {visible.length === 0 && (
            <li className="p-6 text-center text-muted">{!showAll && fitCount === 0 && !needle ? t("noFit") : t("noResults")}</li>
          )}
          {visible.map(({ part, issues }) => (
            <li
              key={part.id}
              className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-3 ${issues.length ? "border-danger/40" : "border-line"}`}
            >
              <div className="min-w-0 flex-1 basis-60">
                <p className="font-semibold">{part.brand} {part.name}</p>
                <p className="font-mono text-xs text-muted">{keySpecs(part, specT)}</p>
                {issues.map((issue) => (
                  <p key={issue.code} className="mt-1 text-xs text-danger">
                    {tCompat(issue.code as never, issue.params as never)}
                  </p>
                ))}
              </div>
              <span className="font-mono text-sm">{formatUzs(part.priceUzs, locale)}</span>
              <button
                type="button"
                className={`btn ${issues.length ? "btn-ghost" : "btn-primary"}`}
                onClick={() => onPick(part)}
              >
                {issues.length ? t("pickAnyway") : t("pick")}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
