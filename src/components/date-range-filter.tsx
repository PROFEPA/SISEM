"use client";

import { useEffect, useState } from "react";
import { CalendarRange, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseDateRangeValues } from "@/lib/date-range";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onApply: (from: string, to: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function DateRangeFilter({
  from,
  to,
  onApply,
  onClear,
  disabled = false,
}: DateRangeFilterProps) {
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraftFrom(from);
    setDraftTo(to);
    setError(null);
  }, [from, to]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!draftFrom || !draftTo) {
      setError("Selecciona una fecha inicial y una fecha final");
      return;
    }

    const parsed = parseDateRangeValues(draftFrom, draftTo);
    if (!parsed.success) {
      setError(parsed.error);
      return;
    }

    setError(null);
    onApply(draftFrom, draftTo);
  }

  function handleClear() {
    setDraftFrom("");
    setDraftTo("");
    setError(null);
    onClear();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" aria-label="Filtro por periodo">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 pb-2 text-sm font-medium text-foreground">
          <CalendarRange className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          Periodo por fecha de resolución
        </div>
        <div className="space-y-1">
          <label htmlFor="fecha-desde" className="block text-xs text-muted-foreground">
            Fecha inicial
          </label>
          <Input
            id="fecha-desde"
            type="date"
            value={draftFrom}
            onChange={(event) => setDraftFrom(event.target.value)}
            className="h-9 w-[165px]"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="fecha-hasta" className="block text-xs text-muted-foreground">
            Fecha final
          </label>
          <Input
            id="fecha-hasta"
            type="date"
            value={draftTo}
            onChange={(event) => setDraftTo(event.target.value)}
            className="h-9 w-[165px]"
            disabled={disabled}
          />
        </div>
        <Button type="submit" size="sm" disabled={disabled}>
          Aplicar
        </Button>
        {(from || to || draftFrom || draftTo) && (
          <Button type="button" variant="ghost" size="sm" onClick={handleClear} disabled={disabled}>
            <X className="mr-1 h-4 w-4" aria-hidden="true" />
            Limpiar
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </form>
  );
}
