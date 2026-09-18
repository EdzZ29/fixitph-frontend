"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Paginated } from "@/lib/api/client";

/**
 * Previous/next rather than numbered pages.
 *
 * The API caps `limit` at 50 and every dashboard list is ordered by something
 * meaningful (soonest booking, oldest unresolved dispute). Jumping to page 7
 * of a queue is not a thing anyone wants to do; seeing where you are and
 * stepping is.
 */
export function Pagination({
  page,
  result,
  onPageChange,
  unit = "row",
}: {
  page: number;
  result: Pick<Paginated<unknown>, "total" | "totalPages" | "limit"> | null;
  onPageChange: (page: number) => void;
  unit?: string;
}) {
  if (!result || result.total === 0) return null;

  const from = (page - 1) * result.limit + 1;
  const to = Math.min(page * result.limit, result.total);
  const single = result.totalPages <= 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <p className="text-muted-foreground text-sm tabular-nums">
        {single ? (
          <>
            {result.total.toLocaleString("en-PH")} {unit}
            {result.total === 1 ? "" : "s"}
          </>
        ) : (
          <>
            {from}–{to} of {result.total.toLocaleString("en-PH")}
          </>
        )}
      </p>

      {single ? null : (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft aria-hidden />
            Previous
          </Button>
          <span className="text-muted-foreground px-1 text-sm tabular-nums">
            {page} / {result.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= result.totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
