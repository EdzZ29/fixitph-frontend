import {
  BadgeCheck,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileSearch,
  FolderTree,
  Gavel,
  Heart,
  LayoutDashboard,
  MessageSquareWarning,
  ScrollText,
  Settings,
  Star,
  Store,
  Tags,
  UserCog,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/lib/api/client";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** A short line for the overview cards; not shown in the sidebar. */
  blurb?: string;
  /** Which queue count from the admin stats to show as a pill, if any. */
  badge?: "pendingVerifications" | "openReports" | "openDisputes";
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * The navigation for each role, and the definition of what each role's
 * dashboard is *for*:
 *
 *   CUSTOMER — their own bookings, and the requests and quotes those come from.
 *   PROVIDER — their own services, and the work those bring in.
 *   ADMIN    — platform resources: people, listings, moderation, configuration.
 *
 * Kept as data rather than markup because three things read it: the sidebar,
 * the mobile sheet, and the overview grids. A route added here appears in all
 * three.
 */
const CUSTOMER: NavSection[] = [
  {
    title: "My work",
    items: [
      {
        href: "/dashboard",
        label: "Overview",
        icon: LayoutDashboard,
        blurb: "What is happening with your jobs right now.",
      },
      {
        href: "/dashboard/bookings",
        label: "Bookings",
        icon: CalendarCheck,
        blurb: "Confirm, reschedule, cancel and review your jobs.",
      },
      {
        href: "/dashboard/requests",
        label: "Requests & quotes",
        icon: ClipboardList,
        blurb: "Jobs you have posted and the quotes that came back.",
      },
    ],
  },
  {
    title: "Saved",
    items: [
      {
        href: "/dashboard/favorites",
        label: "Saved providers",
        icon: Heart,
        blurb: "The tradespeople you want to call again.",
      },
    ],
  },
];

const PROVIDER: NavSection[] = [
  {
    title: "My business",
    items: [
      {
        href: "/provider",
        label: "Overview",
        icon: LayoutDashboard,
        blurb: "Today's jobs, your rating, and what needs attention.",
      },
      {
        href: "/provider/services",
        label: "My services",
        icon: Wrench,
        blurb: "Create, price, publish and pause what you offer.",
      },
      {
        href: "/provider/profile",
        label: "My profile",
        icon: Store,
        blurb: "Your public profile: name, area, rates and how you take payment.",
      },
      {
        href: "/provider/verification",
        label: "Verification",
        icon: BadgeCheck,
        blurb: "Send your ID or permit, and see which checks you have passed.",
      },
    ],
  },
  {
    title: "Work",
    items: [
      {
        href: "/provider/calendar",
        label: "Calendar",
        icon: CalendarDays,
        blurb: "Your month: confirmed jobs and the requests you are waiting on.",
      },
      {
        href: "/provider/jobs",
        label: "Jobs",
        icon: CalendarCheck,
        blurb: "Confirm, start and complete your bookings.",
      },
      {
        href: "/provider/requests",
        label: "Open requests",
        icon: ClipboardList,
        blurb: "Jobs posted near you that you can quote for.",
      },
      {
        href: "/provider/reviews",
        label: "Reviews",
        icon: Star,
        blurb: "What customers said, and your replies.",
      },
    ],
  },
];

const ADMIN: NavSection[] = [
  {
    title: "Platform",
    items: [
      {
        href: "/admin",
        label: "Analytics",
        icon: LayoutDashboard,
        blurb: "Accounts, bookings and the state of every queue.",
      },
      {
        href: "/admin/users",
        label: "Users",
        icon: UserCog,
        blurb: "Search accounts, suspend and reinstate.",
      },
      {
        href: "/admin/verification",
        label: "Verification",
        icon: BadgeCheck,
        blurb: "Review provider documents and approve or reject.",
        badge: "pendingVerifications",
      },
    ],
  },
  {
    title: "Catalogue",
    items: [
      {
        href: "/admin/listings",
        label: "Listings",
        icon: Tags,
        blurb: "Moderate services: pause, take down, reinstate.",
      },
      {
        href: "/admin/categories",
        label: "Categories",
        icon: FolderTree,
        blurb: "The category tree every listing hangs off.",
      },
    ],
  },
  {
    title: "Moderation",
    items: [
      {
        href: "/admin/reports",
        label: "Reports",
        icon: MessageSquareWarning,
        blurb: "What people have flagged, and what came of it.",
        badge: "openReports",
      },
      {
        href: "/admin/disputes",
        label: "Disputes",
        icon: Gavel,
        blurb: "Booking disputes awaiting a decision.",
        badge: "openDisputes",
      },
      {
        href: "/admin/reviews",
        label: "Reviews",
        icon: Star,
        blurb: "Hide or restore reviews, and see what was reported.",
      },
      {
        href: "/admin/bookings",
        label: "Bookings",
        icon: CalendarCheck,
        blurb: "Every booking on the platform, at any status.",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        href: "/admin/settings",
        label: "Settings",
        icon: Settings,
        blurb: "Platform configuration, with every change audited.",
      },
      {
        href: "/admin/audit",
        label: "Audit log",
        icon: ScrollText,
        blurb: "Every admin action, insert-only and in order.",
      },
    ],
  },
];

export const NAV_FOR_ROLE: Record<UserRole, NavSection[]> = {
  CUSTOMER,
  PROVIDER,
  ADMIN,
};

export const ROLE_LABEL: Record<UserRole, string> = {
  CUSTOMER: "Customer",
  PROVIDER: "Provider",
  ADMIN: "Administrator",
};

/** Icon for the "nothing matched" case, kept here so pages share one. */
export const SEARCH_ICON = FileSearch;

/**
 * Matches the current path to a nav item. Exact for a section root like
 * /admin, prefix otherwise, so /provider/services/new still highlights
 * "My services".
 */
export function isActive(href: string, pathname: string): boolean {
  const roots = ["/dashboard", "/provider", "/admin"];
  if (roots.includes(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
