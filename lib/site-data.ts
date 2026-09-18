import {
  AirVent,
  Car,
  Cctv,
  Droplets,
  Hammer,
  Laptop,
  PlugZap,
  SprayCan,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";

export type ServiceCategory = {
  slug: string;
  name: string;
  /** What people actually call this trade locally. */
  localName?: string;
  icon: LucideIcon;
  /** Short line describing the most common job, not a feature list. */
  blurb: string;
  startingRate: string;
  providerCount: number;
};

export const categories: ServiceCategory[] = [
  {
    slug: "plumbing",
    name: "Plumbing",
    localName: "Tubero",
    icon: Droplets,
    blurb: "Leaking pipes, clogged drains, water line and toilet repair.",
    startingRate: "₱600",
    providerCount: 84,
  },
  {
    slug: "electrical",
    name: "Electrical",
    localName: "Elektrisista",
    icon: PlugZap,
    blurb: "Rewiring, breaker panels, outlets, and post brownout checks.",
    startingRate: "₱800",
    providerCount: 71,
  },
  {
    slug: "aircon",
    name: "Aircon",
    icon: AirVent,
    blurb: "Cleaning, freon charging, installation for split and window type.",
    startingRate: "₱450",
    providerCount: 112,
  },
  {
    slug: "computer-repair",
    name: "Computer Repair",
    icon: Laptop,
    blurb: "Laptop and PC repair, reformatting, data recovery, CCTV setup.",
    startingRate: "₱350",
    providerCount: 46,
  },
  {
    slug: "auto-repair",
    name: "Auto Repair",
    icon: Car,
    blurb: "Home service tune up, brakes, batteries, motorcycle and car.",
    startingRate: "₱500",
    providerCount: 58,
  },
  {
    slug: "cleaning",
    name: "Cleaning",
    icon: SprayCan,
    blurb: "Deep cleaning, move out, and post construction cleanup.",
    startingRate: "₱1,200",
    providerCount: 63,
  },
];

/** Secondary trades, listed as plain links the way a real directory would. */
export const moreServices: { name: string; icon: LucideIcon }[] = [
  { name: "Welding and gate repair", icon: Hammer },
  { name: "CCTV installation", icon: Cctv },
  { name: "Appliance repair", icon: WashingMachine },
];

export type Provider = {
  name: string;
  initials: string;
  trade: string;
  city: string;
  barangay: string;
  rating: number;
  jobs: number;
  startingRate: string;
  rateUnit: string;
  verified: string[];
  availability: string;
};

export const featuredProviders: Provider[] = [
  {
    name: "Rommel Saavedra",
    initials: "RS",
    trade: "Aircon cleaning and repair",
    city: "Butuan City",
    barangay: "Ampayon",
    rating: 4.9,
    jobs: 127,
    startingRate: "₱450",
    rateUnit: "per split type unit",
    verified: ["Valid ID", "Business permit"],
    availability: "Open today until 6PM",
  },
  {
    name: "Arnel Cabrera",
    initials: "AC",
    trade: "Licensed electrician, rewiring",
    city: "Iligan City",
    barangay: "Tibanga",
    rating: 5.0,
    jobs: 58,
    startingRate: "₱800",
    rateUnit: "site visit and assessment",
    verified: ["Valid ID", "PRC licence"],
    availability: "Books 2 days ahead",
  },
  {
    name: "Kyla Mondejar",
    initials: "KM",
    trade: "Laptop and PC repair",
    city: "Butuan City",
    barangay: "J.C. Aquino Ave",
    rating: 4.7,
    jobs: 211,
    startingRate: "₱350",
    rateUnit: "diagnostic, waived if repaired",
    verified: ["Valid ID", "Business permit"],
    availability: "Walk in or pickup",
  },
  {
    name: "Dante Ompoc",
    initials: "DO",
    trade: "Tubero, leak and water line",
    city: "Valencia City",
    barangay: "Poblacion",
    rating: 4.8,
    jobs: 73,
    startingRate: "₱600",
    rateUnit: "first hour, parts separate",
    verified: ["Valid ID", "Barangay clearance"],
    availability: "Same day for leaks",
  },
  {
    name: "Jocelyn Balaba",
    initials: "JB",
    trade: "Deep and post construction cleaning",
    city: "Cagayan de Oro",
    barangay: "Carmen",
    rating: 4.8,
    jobs: 94,
    startingRate: "₱1,200",
    rateUnit: "per unit, up to 40 sqm",
    verified: ["Valid ID", "Team of 4"],
    availability: "Weekends available",
  },
  {
    name: "Ferdinand Ruiz",
    initials: "FR",
    trade: "Home service mechanic",
    city: "Cagayan de Oro",
    barangay: "Lapasan",
    rating: 4.6,
    jobs: 140,
    startingRate: "₱500",
    rateUnit: "callout within city",
    verified: ["Valid ID", "TESDA NC II"],
    availability: "Open today until 8PM",
  },
];

export type Step = {
  id: string;
  label: string;
  /** Fits five across on a 360px phone. */
  shortLabel: string;
  headline: string;
  body: string;
  detail: string;
};

export const steps: Step[] = [
  {
    id: "find",
    label: "Find",
    shortLabel: "Find",
    headline: "Search your barangay, not the whole country",
    body: "Type the service and where you are. You get providers who actually cover your area, with their starting rate already showing.",
    detail: "Average 14 providers per service in Butuan and Cagayan de Oro.",
  },
  {
    id: "compare",
    label: "Compare",
    shortLabel: "Compare",
    headline: "Rates and past jobs side by side",
    body: "Every profile shows the starting rate, how many jobs the person finished, and what previous customers paid for similar work.",
    detail: "Ratings come only from jobs marked finished on the platform.",
  },
  {
    id: "quote",
    label: "Request a quote",
    shortLabel: "Quote",
    headline: "Describe the job once, send it to three people",
    body: "Upload a photo of the leak or the breaker panel. Providers reply with a fixed quote, so you are not guessing at the price.",
    detail: "Most quotes come back within 3 hours on weekdays.",
  },
  {
    id: "book",
    label: "Book",
    shortLabel: "Book",
    headline: "Pick a slot and lock the price",
    body: "Choose a date, confirm the quote, and both sides get the agreed scope in writing. Pay cash, GCash, or bank transfer after the work.",
    detail: "No payment is held before the job is done.",
  },
  {
    id: "review",
    label: "Review",
    shortLabel: "Review",
    headline: "Rate the work so the next person knows",
    body: "After the job closes, you rate the work and the final amount. That record is what makes the next search useful for everyone.",
    detail: "Reviews stay attached to the booking and cannot be bought.",
  },
];

export type City = {
  name: string;
  region: string;
  coordinates: [number, number];
  providerCount: number;
  /** Cities with a live provider pool versus ones taking signups. */
  status: "live" | "opening";
};

export const cities: City[] = [
  { name: "Butuan City", region: "Caraga", coordinates: [125.5406, 8.9475], providerCount: 148, status: "live" },
  { name: "Cagayan de Oro", region: "Northern Mindanao", coordinates: [124.6319, 8.4542], providerCount: 176, status: "live" },
  { name: "Iligan City", region: "Northern Mindanao", coordinates: [124.2452, 8.228], providerCount: 92, status: "live" },
  { name: "Valencia City", region: "Bukidnon", coordinates: [125.0944, 7.9006], providerCount: 41, status: "live" },
  { name: "Malaybalay", region: "Bukidnon", coordinates: [125.1278, 8.1575], providerCount: 33, status: "live" },
  { name: "Gingoog City", region: "Misamis Oriental", coordinates: [125.1, 8.8286], providerCount: 18, status: "opening" },
  { name: "Surigao City", region: "Caraga", coordinates: [125.4889, 9.7838], providerCount: 24, status: "opening" },
  { name: "Ozamiz City", region: "Misamis Occidental", coordinates: [123.8444, 8.1462], providerCount: 16, status: "opening" },
  { name: "Cabadbaran", region: "Caraga", coordinates: [125.5344, 9.1236], providerCount: 12, status: "opening" },
  { name: "Bayugan City", region: "Caraga", coordinates: [125.75, 8.7139], providerCount: 11, status: "opening" },
];

export const navLinks = [
  { label: "Find a provider", href: "/providers" },
  { label: "Services", href: "/search?tab=services" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Become a provider", href: "/provider/profile" },
];

/** Suggestions for the hero search field. Plain words people actually type. */
export const searchSuggestions = [
  "Aircon cleaning",
  "Aircon installation",
  "Tubero",
  "Clogged drain",
  "Electrical rewiring",
  "Breaker panel repair",
  "Laptop repair",
  "CCTV installation",
  "Motorcycle tune up",
  "Deep cleaning",
  "Welding and gate repair",
  "Washing machine repair",
];
