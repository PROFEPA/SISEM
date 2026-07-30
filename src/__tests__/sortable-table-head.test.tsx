import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SortableTableHead } from "@/components/sortable-table-head";

describe("SortableTableHead", () => {
  it("expone aria-sort y activa el ordenamiento con teclado o clic", () => {
    const onSort = vi.fn();
    render(
      <table>
        <thead>
          <tr>
            <SortableTableHead
              field="monto"
              label="Monto"
              current="monto"
              direction="desc"
              defaultDirection="desc"
              onSort={onSort}
            />
          </tr>
        </thead>
      </table>
    );

    expect(screen.getByRole("columnheader").getAttribute("aria-sort")).toBe("descending");
    fireEvent.click(screen.getByRole("button", { name: /Ordenar Monto/i }));
    expect(onSort).toHaveBeenCalledWith("monto", "desc");
  });
});
