"use client";

import Form from "next/form";
import type { ReactNode } from "react";

/** Submits on every change, and still works as a plain form with the submit button. */
export function FilterForm({ action, children, className }: { action: string; children: ReactNode; className?: string }) {
  return (
    <Form action={action} className={className} onChange={(e) => e.currentTarget.requestSubmit()}>
      {children}
    </Form>
  );
}
