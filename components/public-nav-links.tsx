"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { playHapticSound } from "@/lib/motion-feedback";

interface NavItem {
  label: string;
  href: string;
  key: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", key: "home" },
  { label: "About", href: "/about", key: "about" },
  { label: "Services", href: "/#services", key: "services" },
  { label: "Gallery", href: "/#gallery", key: "gallery" },
  { label: "Contact", href: "/#contact", key: "contact" },
];

export function PublicNavLinks() {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<string>("home");

  // Determine active item based on pathname and scroll position
  useEffect(() => {
    // 1. Dedicated Subpages
    if (pathname === "/about") {
      setActiveSection("about");
      return;
    }

    if (pathname !== "/") {
      setActiveSection("");
      return;
    }

    // 2. Homepage ("/") Scroll Spy & Hash Observer
    const determineActiveSection = () => {
      const scrollPosition = window.scrollY + 160; // Offset for sticky header

      const contactEl = document.getElementById("contact");
      const galleryEl = document.getElementById("gallery");
      const servicesEl = document.getElementById("services");

      if (contactEl && scrollPosition >= contactEl.offsetTop - 50) {
        setActiveSection("contact");
      } else if (galleryEl && scrollPosition >= galleryEl.offsetTop - 50) {
        setActiveSection("gallery");
      } else if (servicesEl && scrollPosition >= servicesEl.offsetTop - 50) {
        setActiveSection("services");
      } else {
        setActiveSection("home");
      }
    };

    // Initial check on mount
    if (window.location.hash) {
      const hash = window.location.hash.replace("#", "");
      if (["services", "gallery", "contact"].includes(hash)) {
        setActiveSection(hash);
      } else {
        determineActiveSection();
      }
    } else {
      determineActiveSection();
    }

    // Listen to scroll events
    window.addEventListener("scroll", determineActiveSection, { passive: true });
    window.addEventListener("hashchange", determineActiveSection);

    return () => {
      window.removeEventListener("scroll", determineActiveSection);
      window.removeEventListener("hashchange", determineActiveSection);
    };
  }, [pathname]);

  const handleClick = (item: NavItem) => {
    playHapticSound("tap");
    setActiveSection(item.key);

    // If clicking an on-page anchor while already on "/", smooth scroll
    if (pathname === "/" && item.href.startsWith("/#")) {
      const targetId = item.href.replace("/#", "");
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <nav className="hidden lg:flex items-center space-x-8 text-sm font-semibold text-white">
      {NAV_ITEMS.map((item) => {
        const isActive = activeSection === item.key;

        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={() => handleClick(item)}
            className={`py-1 transition-colors relative group cursor-pointer ${
              isActive ? "text-white font-bold" : "text-white/80 hover:text-[#FFD21C]"
            }`}
          >
            <span>{item.label}</span>
            {/* Active yellow underline */}
            <span
              className={`absolute bottom-0 left-0 h-[3px] bg-[#FFD21C] rounded-full transition-all duration-200 ease-out ${
                isActive
                  ? "w-full opacity-100"
                  : "w-0 opacity-0 group-hover:w-full group-hover:opacity-100"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
