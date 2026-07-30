export type SortDirection = "asc" | "desc";
export type SortValue = string | number | boolean | null | undefined;

const collator = new Intl.Collator("es-MX", {
  numeric: true,
  sensitivity: "base",
});

function isEmpty(value: SortValue): value is null | undefined | "" {
  return value === null || value === undefined || value === "";
}

export function compareSortValues(
  left: SortValue,
  right: SortValue,
  direction: SortDirection
): number {
  const leftEmpty = isEmpty(left);
  const rightEmpty = isEmpty(right);

  // Excel-like behavior: blank values stay at the bottom in both directions.
  if (leftEmpty && rightEmpty) return 0;
  if (leftEmpty) return 1;
  if (rightEmpty) return -1;

  let comparison: number;
  if (typeof left === "number" && typeof right === "number") {
    comparison = left - right;
  } else if (typeof left === "boolean" && typeof right === "boolean") {
    comparison = Number(left) - Number(right);
  } else {
    comparison = collator.compare(String(left), String(right));
  }

  return direction === "asc" ? comparison : -comparison;
}

export function stableSort<T>(
  rows: readonly T[],
  getValue: (row: T) => SortValue,
  direction: SortDirection
): T[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const comparison = compareSortValues(getValue(a.row), getValue(b.row), direction);
      return comparison || a.index - b.index;
    })
    .map(({ row }) => row);
}
