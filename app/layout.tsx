import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Public_Sans } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/lib/auth/session";
import { ChatLauncher } from "@/components/messaging/chat-launcher";
import "./globals.css";

// Display face. Bricolage has a real voice at heavy weights, closer to painted
// shop signage than to a neutral grotesque.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  display: "swap",
});

// Workhorse. Public Sans holds up at 14px on a cheap phone screen, which is
// where most of this traffic will be.
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FixItPH: find a plumber, electrician, or aircon tech near you",
    template: "%s | FixItPH",
  },
  description:
    "Book verified repair and service providers in Butuan, Cagayan de Oro, Iligan, and the rest of Northern Mindanao. See rates and ratings before you message anyone.",
  keywords: [
    "tubero Butuan",
    "elektrisista Cagayan de Oro",
    "aircon cleaning Iligan",
    "computer repair Northern Mindanao",
    "home service Philippines",
  ],
  openGraph: {
    title: "FixItPH: find someone to fix it, today",
    description:
      "Verified plumbers, electricians, aircon techs, and computer repair across Northern Mindanao and Caraga.",
    locale: "en_PH",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0B" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-PH"
      suppressHydrationWarning
      /*
        globals.css sets scroll-behavior: smooth, which is right for an
        in-page anchor and wrong for a route change: without this attribute
        Next cannot tell that the page scrolls smoothly, so moving between
        routes animates its jump to the top and fights scroll restoration on
        the way back. Declaring it lets Next suspend smooth scrolling for the
        navigation itself and leave it alone everywhere else.
      */
      data-scroll-behavior="smooth"
      className={`${bricolage.variable} ${publicSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/*
            One session for the whole app, public pages included.

            Signing in leaves an httpOnly refresh cookie, so a signed-in
            person browsing the directory is still signed in — the header just
            had no way to know it, because every SessionProvider sat inside a
            dashboard. Hoisting it here means the public header can show who
            you are and offer the way back to your dashboard, and moving
            between the marketing site and the dashboard costs no extra
            round trip: the provider mounts once per page load and is shared
            across every client-side navigation after it.
          */}
          <SessionProvider>
            {children}
            {/*
              The chat bubble, mounted once for the whole site rather than per
              dashboard. Somebody comparing providers on a public page is
              often waiting on an answer from one of them, and making them
              navigate back into a booking to read it is how a reply gets
              missed. It renders nothing at all for a visitor who is not
              signed in.
            */}
            <ChatLauncher />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
