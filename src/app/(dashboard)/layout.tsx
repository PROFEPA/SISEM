"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { IProfile } from "@/types";
import Image from "next/image";
import {
  BarChart3,
  FileText,
  Upload,
  Users,
  Building2,
  LogOut,
  Menu,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Home,
  PenLine,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationBell } from "@/components/ui/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { SectionErrorBoundary } from "@/components/section-error-boundary";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/expedientes", label: "Expedientes", icon: FileText },
  { href: "/captura", label: "Capturar Expediente", icon: PenLine, roles: ["admin", "capturador"] },
  { href: "/importar", label: "Importar Excel", icon: Upload, roles: ["admin", "capturador"] },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users, roles: ["admin"] },
  { href: "/admin/orpas", label: "ORPAs", icon: Building2, roles: ["admin"] },
  { href: "/admin/permisos", label: "Permisos", icon: Shield, roles: ["admin"] },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  capturador: "Capturador",
  visualizador: "Visualizador",
};

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  expedientes: "Expedientes",
  captura: "Capturar Expediente",
  importar: "Importar Excel",
  admin: "Administración",
  usuarios: "Usuarios",
  orpas: "ORPAs",
  permisos: "Permisos",
  editar: "Editar",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*, orpa:orpas(nombre, clave)")
          .eq("id", user.id)
          .single();

        if (error) console.error("Error loading profile:", error);
        if (data) setProfile(data as IProfile);
      } catch (err) {
        console.error("Error in loadProfile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const filteredNav = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return profile && item.roles.includes(profile.role);
  });

  // Build breadcrumb from pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, i) => ({
    label: BREADCRUMB_LABELS[segment] || segment,
    href: "/" + pathSegments.slice(0, i + 1).join("/"),
    isLast: i === pathSegments.length - 1,
  }));

  const userInitial = (profile?.nombre_completo || "U")[0].toUpperCase();

  function SidebarContent({ onNavigate, isCollapsed = false }: { onNavigate?: () => void; isCollapsed?: boolean }) {
    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={`${isCollapsed ? 'px-2' : 'px-5'} py-5 border-b border-white/10`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <Image
              src="/logo.png"
              alt="SISEM"
              width={40}
              height={40}
              className="rounded-lg shrink-0"
              priority
            />
            {!isCollapsed && (
              <div>
                <h1 className="font-bold text-lg leading-tight text-white">SISEM</h1>
                <p className="text-[11px] text-white/50 tracking-wide">PROFEPA</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-3'} py-4 space-y-1 overflow-y-auto`}>
          {filteredNav.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} ${isCollapsed ? 'px-2' : 'px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[#1B8A5A] text-white shadow-sm shadow-[#1B8A5A]/30"
                    : "text-white/60 hover:bg-white/8 hover:text-white"
                }`}
                onClick={onNavigate}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {!isCollapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        {!onNavigate && (
          <div className={`${isCollapsed ? 'px-2' : 'px-3'} py-2`}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center py-2 rounded-lg text-white/40 hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
              title={isCollapsed ? "Expandir menú" : "Contraer menú"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {!isCollapsed && <span className="ml-2 text-xs">Contraer</span>}
            </button>
          </div>
        )}

        {/* User section */}
        <div className={`${isCollapsed ? 'px-2' : 'px-3'} py-3 border-t border-white/10`}>
          {loading ? (
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2`}>
              <Skeleton className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
              {!isCollapsed && (
                <div className="flex-1">
                  <Skeleton className="h-3 w-24 mb-1.5 bg-white/10" />
                  <Skeleton className="h-2.5 w-16 bg-white/10" />
                </div>
              )}
            </div>
          ) : profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} ${isCollapsed ? 'px-1' : 'px-3'} py-2 rounded-lg hover:bg-white/8 transition-colors text-left cursor-pointer outline-none`}>
                  <div className="w-8 h-8 rounded-full bg-[#1B8A5A] flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {userInitial}
                  </div>
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {profile.nombre_completo || "Usuario"}
                        </p>
                        <p className="text-[11px] text-white/50">
                          {ROLE_LABELS[profile.role] || profile.role}
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-white/40" />
                    </>
                  )}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile.nombre_completo}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex ${collapsed ? 'w-16' : 'w-64'} flex-col fixed top-0 left-0 h-screen bg-[#0F1923] z-40 transition-all duration-300`}>
        <SidebarContent isCollapsed={collapsed} />
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-h-screen ${collapsed ? 'lg:ml-16' : 'lg:ml-64'} transition-all duration-300`}>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-card border-b border-border px-4 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger className="lg:hidden -ml-2 inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9 hover:bg-accent hover:text-accent-foreground cursor-pointer">
                <Menu className="w-5 h-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-[#0F1923] border-none [&>button]:text-white">
                <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                <SidebarContent onNavigate={() => setSheetOpen(false)} />
              </SheetContent>
            </Sheet>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-sm">
              <Home className="w-3.5 h-3.5 text-muted-foreground" />
              {breadcrumbs.map((crumb) => (
                <span key={crumb.href} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                  {crumb.isLast ? (
                    <span className="font-medium text-foreground">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          </div>

          {/* User avatar (desktop) */}
          <div className="hidden lg:flex items-center gap-3">
            {profile && (
              <div className="flex items-center gap-2.5">
                <ThemeToggle />
                <LanguageToggle />
                <NotificationBell
                  orpaId={profile.role === "admin" ? undefined : profile.orpa_id || undefined}
                />
                <div className="text-right">
                  <p className="text-sm font-medium leading-tight">{profile.nombre_completo || "Usuario"}</p>
                  <p className="text-[11px] text-muted-foreground">{ROLE_LABELS[profile.role]}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#1B8A5A] flex items-center justify-center text-xs font-bold text-white">
                  {userInitial}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <SectionErrorBoundary sectionName="contenido">
            {children}
          </SectionErrorBoundary>
        </main>
      </div>
    </div>
  );
}
