"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, LogOut, Menu, Phone } from "lucide-react";

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
import { navLinks } from "@/lib/site-data";
import { HOME_FOR_ROLE, useSession } from "@/lib/auth/session";
import { ROLE_LABEL } from "@/components/dashboard/nav";
import { initials, personName } from "@/lib/format";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  /**
   * Signing in does not end when you leave the dashboard.
   *
   * The refresh token is an httpOnly cookie, so a signed-in person browsing
   * the directory is still signed in and still subject to their role — the
   * header simply had no way to show it. It reads the session the root layout
   * provides and offers the way back, rather than inviting someone who is
   * already signed in to sign in again.
   *
   * The account area shows "Log in" only when the session is *known* to be
   * anonymous. While it is still loading, or if the read failed — the API
   * being unreachable, or a shared network hitting the rate limit — it shows
   * nothing rather than telling someone who is signed in that they are not.
   */
  const { state, signOut } = useSession();
  const user = state.status === "authenticated" ? state.user : null;
  const anonymous = state.status === "anonymous";

  return (
    <header className="sticky top-0 z-50">
      {/* Utility strip. Real coverage and a real number, the way a local
          business puts its details above the fold. */}
      <div className="bg-brand-panel text-brand-panel-foreground hidden text-xs md:block dark:border-b dark:border-white/10">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
          <p>
            Serving Butuan, Cagayan de Oro, Iligan and 7 more cities in
            Northern Mindanao and Caraga.
          </p>
          <a
            href="tel:+639175550143"
            className="hover:text-white focus-visible:text-white"
          >
            <Phone className="mr-1.5 inline size-3.5 align-[-2px]" aria-hidden />
            Provider hotline 0917 555 0143
          </a>
        </div>
      </div>

      <div className="border-border bg-background/95 border-b backdrop-blur-sm supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 lg:px-8">
          <Link
            href="/"
            className="rounded-sm"
            aria-label="FixItPH home"
          >
            <Logo />
          </Link>

          <nav
            aria-label="Main"
            className="ml-2 hidden items-center gap-1 lg:flex"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md px-3 py-2 text-sm font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />

            {user ? (
              <>
                <Button
                  asChild
                  variant="ghost"
                  className="hidden h-9 px-3 sm:inline-flex"
                >
                  <Link href={HOME_FOR_ROLE[user.role]}>
                    <LayoutDashboard aria-hidden />
                    My dashboard
                  </Link>
                </Button>
                <span
                  aria-hidden
                  title={personName(user.profile, user.email)}
                  className="bg-brand-panel text-brand-panel-foreground hidden size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium sm:flex"
                >
                  {initials(personName(user.profile, user.email))}
                </span>
              </>
            ) : anonymous ? (
              <Button
                asChild
                variant="ghost"
                className="hidden h-9 px-3 sm:inline-flex"
              >
                <Link href="/login">Log in</Link>
              </Button>
            ) : null}

            <Button asChild variant="accent" className="h-9 px-4">
              <Link href="/post-job">Post a job</Link>
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="size-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetHeader className="px-5 pt-5 pb-0">
                  <SheetTitle className="text-left">
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <nav aria-label="Mobile" className="flex flex-col px-3 py-2">
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className="hover:bg-secondary rounded-md px-2 py-2.5 text-base font-medium"
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                  {user ? (
                    <SheetClose asChild>
                      <Link
                        href={HOME_FOR_ROLE[user.role]}
                        className="hover:bg-secondary rounded-md px-2 py-2.5 text-base font-medium"
                      >
                        My dashboard
                      </Link>
                    </SheetClose>
                  ) : anonymous ? (
                    <SheetClose asChild>
                      <Link
                        href="/login"
                        className="hover:bg-secondary rounded-md px-2 py-2.5 text-base font-medium"
                      >
                        Log in
                      </Link>
                    </SheetClose>
                  ) : null}
                </nav>

                {user ? (
                  <>
                    <Separator />
                    <div className="px-5 py-3">
                      <p className="text-sm font-medium">
                        {personName(user.profile, user.email)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Signed in as {ROLE_LABEL[user.role]}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2.5"
                        onClick={() => void signOut()}
                      >
                        <LogOut aria-hidden />
                        Sign out
                      </Button>
                    </div>
                  </>
                ) : null}

                <Separator />
                <div className="text-muted-foreground px-5 py-3 text-sm">
                  <p className="mb-3">
                    Need help posting a job? Call or Viber us.
                  </p>
                  <a
                    href="tel:+639175550143"
                    className="text-primary font-medium"
                  >
                    0917 555 0143
                  </a>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
