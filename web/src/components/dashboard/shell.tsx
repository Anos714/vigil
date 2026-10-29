"use client";

import {
  Activity,
  Bell,
  BookOpen,
  ChevronsUpDown,
  Command as CommandIcon,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Plus,
  Search,
  Server,
  Settings,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLink } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import { monitors } from "@/lib/monitors";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/monitors", label: "Monitors", icon: Activity },
  { href: "/dashboard/incidents", label: "Incidents", icon: ShieldAlert },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const displayName = session?.user?.name ?? "Rahul Sain";
  const displayEmail = session?.user?.email ?? "rahul@acme.dev";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <BrandLink href="/dashboard" className="text-ink" />
      </div>

      <div className="px-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-card px-3 py-2.5 text-left transition-colors hover:border-ink/15 hover:bg-secondary/50">
            <span className="flex size-7 items-center justify-center rounded-lg bg-ink text-[11px] font-semibold text-paper">
              A
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8rem] font-medium">
                Acme workspace
              </span>
              <span className="block truncate font-mono text-[10px] text-muted-ink">
                demo · self-hosted
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 text-muted-ink" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[248px]">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            <DropdownMenuItem>
              <span className="flex size-5 items-center justify-center rounded bg-ink text-[9px] font-semibold text-paper">
                A
              </span>
              Acme
              <span className="ml-auto size-1.5 rounded-full bg-signal-deep" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Plus className="size-4" />
              Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="mt-6 flex-1 px-3">
        <div className="mono-label mb-2 px-3 text-muted-ink">Monitor</div>
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex h-9 items-center gap-2.5 rounded-lg px-3 text-[0.82rem] font-medium transition-colors",
                  active
                    ? "bg-secondary text-ink"
                    : "text-muted-ink hover:bg-secondary/60 hover:text-ink",
                )}
              >
                <item.icon
                  className={cn(
                    "size-4",
                    active ? "text-signal-deep" : "text-muted-ink/80",
                  )}
                  strokeWidth={1.8}
                />
                {item.label}
                {item.label === "Incidents" && (
                  <span className="ml-auto flex size-4 items-center justify-center rounded-full bg-critical/10 font-mono text-[9px] font-semibold text-critical">
                    1
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="mono-label mb-2 mt-7 px-3 text-muted-ink">Public</div>
        <Link
          href="/status/acme-api-live"
          target="_blank"
          onClick={onNavigate}
          className="group flex h-9 items-center gap-2.5 rounded-lg px-3 text-[0.82rem] font-medium text-muted-ink transition-colors hover:bg-secondary/60 hover:text-ink"
        >
          <Globe2 className="size-4 text-muted-ink/80" strokeWidth={1.8} />
          Status page
          <ExternalLink className="ml-auto size-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
        <Link
          href="/docs"
          onClick={onNavigate}
          className="group flex h-9 items-center gap-2.5 rounded-lg px-3 text-[0.82rem] font-medium text-muted-ink transition-colors hover:bg-secondary/60 hover:text-ink"
        >
          <BookOpen className="size-4 text-muted-ink/80" strokeWidth={1.8} />
          Documentation
        </Link>
      </nav>

      <div className="p-3">
        <div className="relative overflow-hidden rounded-xl border border-line bg-card p-3.5">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-signal/30 text-signal-ink">
              <Server className="size-3.5" />
            </span>
            <span className="text-[0.76rem] font-medium">Self-hosted</span>
            <span className="ml-auto rounded-full border border-line px-1.5 py-0.5 font-mono text-[9px] text-muted-ink">
              v0.1
            </span>
          </div>
          <p className="mt-2 text-[0.68rem] leading-4 text-muted-ink">
            Running on your infrastructure. Samples in this preview are local.
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[9px] text-positive">
            <span className="size-1.5 rounded-full bg-positive" />
            all systems nominal
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="mt-3 flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary/60">
            <span className="flex size-7 items-center justify-center rounded-full bg-violet/15 text-[10px] font-semibold text-violet">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.78rem] font-medium">
                {displayName}
              </span>
              <span className="block truncate text-[10px] text-muted-ink">
                {displayEmail}
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 text-muted-ink" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[248px]">
            <DropdownMenuLabel>
              {session?.user ? "Signed in" : "Preview account"}
            </DropdownMenuLabel>
            <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
              <Settings className="size-4" />
              Profile & settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LifeBuoy className="size-4" />
              Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                if (session?.user) {
                  await authClient.signOut();
                }
                router.push("/login");
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search Vigil"
      description="Jump to a monitor or page"
    >
      <CommandInput placeholder="Search monitors, pages, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard className="size-4" />
            Overview
            <CommandShortcut>G O</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/dashboard/incidents")}>
            <ShieldAlert className="size-4" />
            Incidents
            <CommandShortcut>G I</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/status/acme-api-live")}>
            <Globe2 className="size-4" />
            Public status page
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/dashboard/settings")}>
            <Settings className="size-4" />
            Settings
            <CommandShortcut>G ,</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Monitors">
          {monitors.map((monitor) => (
            <CommandItem
              key={monitor.id}
              onSelect={() => go(`/dashboard/monitors/${monitor.id}`)}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  monitor.status === "up" && "bg-positive",
                  monitor.status === "degraded" && "bg-warning",
                  monitor.status === "down" && "bg-critical",
                  monitor.status === "paused" && "bg-muted-ink",
                )}
              />
              {monitor.name}
              <span className="ml-auto font-mono text-[10px] text-muted-ink">
                {monitor.avgLatency}ms
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-dvh bg-paper">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] border-r border-line bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur-md md:px-7">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              aria-label="Open navigation"
              className="inline-flex size-8 items-center justify-center rounded-lg border border-line bg-card text-muted-ink lg:hidden"
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[286px] bg-sidebar p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="hidden items-center gap-2 text-[0.78rem] text-muted-ink sm:flex">
            <span className="font-medium text-ink">Acme</span>
            <span className="text-line">/</span>
            <span>Production</span>
            <span className="rounded-full border border-line bg-card px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]">
              demo data
            </span>
          </div>

          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="ml-auto flex h-8 w-fit items-center gap-2 rounded-lg border border-line bg-card px-2.5 text-[0.75rem] text-muted-ink transition-colors hover:border-ink/15 hover:text-ink sm:w-[220px]"
          >
            <Search className="size-3.5" />
            <span className="hidden sm:inline">Search anything…</span>
            <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[9px] text-muted-ink sm:flex">
              <CommandIcon className="size-2.5" /> K
            </kbd>
          </button>

          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/dashboard/incidents"
                  className="relative inline-flex size-8 items-center justify-center rounded-lg border border-line bg-card text-muted-ink transition-colors hover:bg-secondary hover:text-ink"
                  aria-label="Notifications"
                />
              }
            >
              <Bell className="size-3.5" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-critical ring-2 ring-card" />
            </TooltipTrigger>
            <TooltipContent>1 open incident</TooltipContent>
          </Tooltip>

          <ThemeToggle />

          <Link
            href="/dashboard/monitors/new"
            className={cn(
              buttonVariants({ size: "sm" }),
              "h-8 gap-1.5 rounded-lg bg-ink px-3 text-xs text-paper hover:bg-ink/85",
            )}
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">New monitor</span>
            <span className="sm:hidden">New</span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-7 md:px-7 md:py-9">
          {children}
        </main>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
