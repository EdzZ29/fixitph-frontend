"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LogOut, Menu, PanelsTopLeft } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/site/logo";
import { CountPill } from "@/components/dashboard/status-badge";
import { NotificationPanel } from "@/components/dashboard/notification-panel";
import { ErrorState, Spinner } from "@/components/dashboard/states";
import {
  isActive,
  NAV_FOR_ROLE,
  ROLE_LABEL,
  type NavItem,
  type NavSection,
} from "@/components/dashboard/nav";
import { HOME_FOR_ROLE, useSession } from "@/lib/auth/session";
import { useQuery } from "@/lib/use-query";
import { admin, type UserRole } from "@/lib/api/client";
import { initials, personName } from "@/lib/format";

/**
 * The frame every dashboard page sits in, and the gate in front of it.
 *
 * The gate is client-side by necessity: the access token is in memory and the
 * refresh token is httpOnly, so the browser is the first place that can know
 * who is signed in (see lib/auth/session). This is a courtesy, not the
 * security boundary — every route it fronts is also guarded by the API's role
 * guard and by row level security in Postgres. Deleting this component would
 * make the app ugly, not insecure.
 */
export function DashboardShell({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const { state } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const wrongRole = state.status === "authenticated" && state.user.role !== role;

  useEffect(() => {
    if (state.status === "anonymous") {
      // Carry where they were going, so signing in lands them back here.
      //
      // The query string is read off the location rather than through
      // useSearchParams: that hook opts the whole subtree out of
      // prerendering, and these shells are otherwise static. This runs only
      // in the browser, after mount, where location is the same source
      // useSearchParams would have read.
      const next = `${pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    // A provider who opens /admin goes to their own dashboard rather than a
    // dead end. The API would refuse the data anyway.
    if (wrongRole && state.status === "authenticated") {
      router.replace(HOME_FOR_ROLE[state.user.role]);
    }
  }, [state, wrongRole, router, pathname]);

  if (state.status === "loading" || state.status === "anonymous" || wrongRole) {
    return (
      <div className="flex min-h-svh items-center justify-center gap-2 text-sm">
        <Spinner />
        <span className="text-muted-foreground">
          {state.status === "loading" ? "Checking your session" : "Redirecting"}
        </span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-20">
        <ErrorState
          error={{ message: state.message, code: "SESSION_ERROR", status: 0 }}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const sections = NAV_FOR_ROLE[role];
  const user = state.user;
  const name = personName(user.profile, user.email);

  return (
    <div className="flex min-h-svh flex-col">
      <TopBar role={role} name={name} />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-6 lg:px-8">
        {/* Desktop rail. Hidden below lg, where the sheet in TopBar takes over. */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav aria-label={`${ROLE_LABEL[role]} dashboard`} className="sticky top-20">
            <SideNav sections={sections} role={role} />
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-12">{children}</main>
      </div>
    </div>
  );
}

function TopBar({ role, name }: { role: UserRole; name: string }) {
  const { signOut } = useSession();
  const sections = NAV_FOR_ROLE[role];

  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/85 sticky top-0 z-50 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 lg:px-8">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-9 lg:hidden"
              aria-label="Open dashboard menu"
            >
              <Menu className="size-5" aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="px-5 pt-5 pb-0">
              <SheetTitle className="text-left">
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <div className="px-3 py-2">
              <SideNav sections={sections} role={role} closeOnNavigate />
            </div>
            <Separator />
            <div className="px-5 py-1">
              <p className="text-muted-foreground text-sm">
                Signed in as {name}
              </p>
              <p className="text-muted-foreground text-xs">{ROLE_LABEL[role]}</p>
            </div>
          </SheetContent>
        </Sheet>

        <Link href={HOME_FOR_ROLE[role]} aria-label="FixItPH dashboard home">
          <Logo />
        </Link>

        <span
          className="bg-secondary text-secondary-foreground ml-1 hidden rounded-4xl px-2.5 py-1 text-xs font-medium sm:inline-flex"
          aria-label={`Signed in as ${ROLE_LABEL[role]}`}
        >
          {ROLE_LABEL[role]}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <NotificationPanel />
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/">
              <PanelsTopLeft aria-hidden />
              Public site
            </Link>
          </Button>
          <span className="text-muted-foreground hidden text-sm md:inline">
            {name}
          </span>
          <span
            aria-hidden
            className="bg-brand-panel text-brand-panel-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium md:hidden"
          >
            {initials(name)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void signOut()}
            aria-label="Sign out"
          >
            <LogOut aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function SideNav({
  sections,
  role,
  closeOnNavigate = false,
}: {
  sections: NavSection[];
  role: UserRole;
  closeOnNavigate?: boolean;
}) {
  const pathname = usePathname();

  // Only admins have queues worth badging, and only they can read the stats.
  const { data: stats } = useQuery(
    () => (role === "ADMIN" ? admin.stats() : Promise.resolve(null)),
    [role],
  );

  const countFor = (item: NavItem) =>
    item.badge && stats ? stats.queue[item.badge] : 0;

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="text-muted-foreground px-2 pb-1.5 text-xs font-medium tracking-wide uppercase">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(item.href, pathname);
              const link = (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-brand-lime-ink" : "",
                    )}
                    aria-hidden
                  />
                  {item.label}
                  <CountPill count={countFor(item) ?? 0} tone="critical" />
                </Link>
              );

              return (
                <li key={item.href}>
                  {closeOnNavigate ? (
                    <SheetClose asChild>{link}</SheetClose>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
