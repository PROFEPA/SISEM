import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Missing config" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const results: Record<string, { rows: number; error: string | null }> = {};

  const tables = ["expedientes", "profiles", "orpas", "expediente_historial", "estatus_expediente"];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*");

      if (error) {
        results[table] = { rows: 0, error: error.message };
        continue;
      }

      if (!data || data.length === 0) {
        results[table] = { rows: 0, error: null };
        continue;
      }

      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(","),
        ...data.map((row) =>
          headers
            .map((h) => {
              const val = row[h];
              if (val === null || val === undefined) return "";
              const str = String(val);
              // Escape CSV: wrap in quotes if contains comma, newline, or quote
              if (str.includes(",") || str.includes("\n") || str.includes('"')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(",")
        ),
      ];
      const csv = csvRows.join("\n");

      // Upload to Supabase Storage
      const fileName = `${table}/${timestamp}.csv`;
      const { error: uploadError } = await supabase.storage
        .from("backups")
        .upload(fileName, new Blob([csv], { type: "text/csv" }), {
          contentType: "text/csv",
          upsert: true,
        });

      if (uploadError) {
        results[table] = { rows: data.length, error: `Upload: ${uploadError.message}` };
      } else {
        results[table] = { rows: data.length, error: null };
      }
    } catch (e) {
      results[table] = { rows: 0, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  // Cleanup old backups (older than 30 days)
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const table of tables) {
      const { data: files } = await supabase.storage
        .from("backups")
        .list(table, { limit: 1000 });

      if (files) {
        const oldFiles = files.filter((f) => {
          const created = new Date(f.created_at || 0);
          return created < thirtyDaysAgo;
        });

        if (oldFiles.length > 0) {
          await supabase.storage
            .from("backups")
            .remove(oldFiles.map((f) => `${table}/${f.name}`));
        }
      }
    }
  } catch {
    // Cleanup errors are non-fatal
  }

  return NextResponse.json({
    timestamp,
    results,
    message: "Backup completado",
  });
}
