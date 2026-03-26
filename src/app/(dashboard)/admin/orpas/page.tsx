"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2 } from "lucide-react";
import type { IOrpa } from "@/types";

export default function OrpasPage() {
  const supabase = createClient();
  const [orpas, setOrpas] = useState<IOrpa[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrpas() {
    setLoading(true);
    const { data } = await supabase
      .from("orpas")
      .select("*")
      .order("nombre");
    if (data) setOrpas(data);
    setLoading(false);
  }

  useEffect(() => {
    loadOrpas();
  }, []);

  async function toggleActive(orpaId: string, currentActive: boolean) {
    await supabase
      .from("orpas")
      .update({ activa: !currentActive })
      .eq("id", orpaId);
    loadOrpas();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          ORPAs
        </h1>
        <p className="text-muted-foreground text-sm">
          Catálogo de Oficinas de Representación
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clave</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Activa</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                orpas.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono font-medium">{o.clave}</TableCell>
                    <TableCell>{o.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{o.estado}</TableCell>
                    <TableCell>
                      <Badge variant={o.activa ? "default" : "secondary"}>
                        {o.activa ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(o.id, o.activa)}
                      >
                        {o.activa ? "Desactivar" : "Activar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
