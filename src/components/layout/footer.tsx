import Link from "next/link";
import { Building2 } from "lucide-react";

const FOOTER_SECTIONS = [
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/careers", label: "Careers" },
      { href: "/press", label: "Press" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Help center" },
      { href: "/contact", label: "Contact us" },
      { href: "/safety", label: "Safety information" },
    ],
  },
  {
    title: "Hosting",
    links: [
      { href: "/host", label: "List your property" },
      { href: "/host/resources", label: "Hosting resources" },
      { href: "/host/community", label: "Community forum" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
      { href: "/sitemap", label: "Sitemap" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Building2 className="size-4" />
              </span>
              Stayly
            </Link>
            <p className="mt-4 text-sm text-secondary-foreground/60">
              Find your perfect stay, anywhere in the world.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold">{section.title}</h3>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-secondary-foreground/60 transition-colors hover:text-secondary-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-secondary-foreground/10 pt-8 sm:flex-row">
          <p className="text-sm text-secondary-foreground/60">
            &copy; {new Date().getFullYear()} Stayly, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
