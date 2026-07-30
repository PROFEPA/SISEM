"use client";

import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import type { SortDirection } from "@/lib/table-sort";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps {
  field: string;
  label: string;
  current: string;
  direction: SortDirection;
  onSort: (field: string, defaultDirection?: SortDirection) => void;
  defaultDirection?: SortDirection;
  align?: "left" | "center" | "right";
  className?: string;
}

export function SortableTableHead({
  field,
  label,
  current,
  direction,
  onSort,
  defaultDirection = "asc",
  align = "left",
  className,
}: SortableTableHeadProps) {
  const active = current === field;
  const ariaSort = active
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none";
  const nextDirection = active
    ? direction === "asc" ? "desc" : "asc"
    : defaultDirection;

  return (
    <TableHead
      aria-sort={ariaSort}
      className={cn(
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(field, defaultDirection)}
        className={cn(
          "inline-flex w-full cursor-pointer select-none items-center gap-1 rounded-sm py-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          align === "right" && "justify-end",
          align === "center" && "justify-center"
        )}
        aria-label={`Ordenar ${label} ${nextDirection === "desc" ? "de mayor a menor" : "de menor a mayor"}`}
      >
        <span>{label}</span>
        {active ? (
          direction === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-35" aria-hidden="true" />
        )}
      </button>
    </TableHead>
  );
}
