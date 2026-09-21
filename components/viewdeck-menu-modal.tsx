"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  X,
  Phone,
  Utensils,
  Coffee,
  Sparkles,
  Clock,
  Search,
  Flame,
  CheckCircle2,
  ChevronRight,
  Building,
  Users,
  Wind,
  Volume2,
  Car,
  ShieldCheck,
  Layers,
  ArrowRight,
  Gift,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { playHapticSound } from "@/lib/motion-feedback";

export interface MenuItem {
  sku: string;
  name: string;
  category: "Coffee & Espresso" | "Meals & Silog" | "Snacks & Dimsum" | "Beverages & Shakes";
  price: number;
  isPopular?: boolean;
  desc: string;
  image?: string;
}

export const VIEWDECK_MENU_ITEMS: MenuItem[] = [
  {
    sku: "00-01",
    name: "Long Black",
    category: "Coffee & Espresso",
    price: 110.0,
    desc: "Double shot of espresso diluted with hot water with rich golden crema.",
    image: "/coffee/long-black.jpg",
  },
  {
    sku: "00-02",
    name: "Cappuccino Italiano",
    category: "Coffee & Espresso",
    price: 130.0,
    desc: "Espresso topped with steamed milk foam and cocoa dusting.",
    image: "/coffee/cappuccino.jpg",
  },
  {
    sku: "00-04",
    name: "Iced Spanish Latte",
    category: "Coffee & Espresso",
    price: 145.0,
    isPopular: true,
    desc: "Espresso sweetened with condensed milk and fresh milk over ice.",
    image: "/coffee/spanish-latte.jpg",
  },
  {
    sku: "00-05",
    name: "Seasalt Cream Latte",
    category: "Coffee & Espresso",
    price: 150.0,
    isPopular: true,
    desc: "Espresso crowned with thick hand-whipped sea salt sweet cream.",
    image: "/coffee/seasalt-latte.jpg",
  },
  {
    sku: "00-07",
    name: "Caramel Macchiato",
    category: "Coffee & Espresso",
    price: 150.0,
    desc: "Steamed vanilla milk marked with espresso and golden caramel drizzle.",
    image: "/coffee/caramel-macchiato.jpg",
  },
  {
    sku: "00-09",
    name: "Brown Sugar Latte",
    category: "Coffee & Espresso",
    price: 145.0,
    isPopular: true,
    desc: "Caramelized brown sugar tiger stripes with milk, ice, and espresso.",
    image: "/coffee/brown-sugar-latte.jpg",
  },
  {
    sku: "00-10",
    name: "Artisan Iced Mocha",
    category: "Coffee & Espresso",
    price: 150.0,
    desc: "70% dark chocolate ganache swirled with espresso and cold foam.",
    image: "/coffee/mocha-latte.jpg",
  },
  {
    sku: "00-11",
    name: "Choco Hazelnut Latte",
    category: "Coffee & Espresso",
    price: 150.0,
    desc: "Roasted hazelnut chocolate mocha with espresso and hazelnut dust.",
    image: "/coffee/choco-hazelnut.jpg",
  },
  {
    sku: "00-13",
    name: "Flat White Decaf",
    category: "Coffee & Espresso",
    price: 145.0,
    desc: "Decaffeinated espresso with smooth steamed milk.",
  },
  {
    sku: "00-20",
    name: "Seasalt Butterscotch Decaf",
    category: "Coffee & Espresso",
    price: 165.0,
    desc: "Decaf roast with golden butterscotch syrup and sea salt cream.",
    image: "/coffee/seasalt-butterscotch.jpg",
  },
  {
    sku: "K00-09",
    name: "Signature Tapsilog",
    category: "Meals & Silog",
    price: 160.0,
    isPopular: true,
    desc: "Garlic beef tapa served with garlic fried rice, fried egg, and atchara.",
  },
  {
    sku: "K00-06",
    name: "Crispy Liemposilog",
    category: "Meals & Silog",
    price: 165.0,
    isPopular: true,
    desc: "Crispy fried pork belly served with spiced vinegar, garlic rice, and fried egg.",
  },
  {
    sku: "K00-01",
    name: "Baconsilog",
    category: "Meals & Silog",
    price: 140.0,
    desc: "Crispy bacon strips served with garlic fried rice and fried egg.",
  },
  {
    sku: "K00-02",
    name: "Bangsilog",
    category: "Meals & Silog",
    price: 155.0,
    desc: "Pan-fried marinated boneless bangus with garlic fried rice and fried egg.",
  },
  {
    sku: "K00-03",
    name: "Chickensilog",
    category: "Meals & Silog",
    price: 150.0,
    desc: "Crispy fried chicken fillet with savory gravy, garlic rice, and fried egg.",
  },
  {
    sku: "K00-07",
    name: "Garlic Longsilog",
    category: "Meals & Silog",
    price: 140.0,
    desc: "Garlic longganisa served with garlic fried rice and fried egg.",
  },
  {
    sku: "K00-10",
    name: "Tocilog Sweet Cured",
    category: "Meals & Silog",
    price: 145.0,
    desc: "Sweet cured pork tocino served with garlic fried rice and fried egg.",
  },
  {
    sku: "K00-12",
    name: "Beef Nachos Supreme",
    category: "Snacks & Dimsum",
    price: 150.0,
    isPopular: true,
    desc: "Tortilla chips topped with warm cheese sauce, seasoned ground beef, and jalapeños.",
  },
  {
    sku: "K00-14",
    name: "Seasoned Wedge Fries",
    category: "Snacks & Dimsum",
    price: 90.0,
    desc: "Crispy potato wedges tossed in choice of BBQ, Sour Cream, or Cheese seasoning.",
  },
  {
    sku: "K00-23",
    name: "Steamed Pork Siomai (4 pcs)",
    category: "Snacks & Dimsum",
    price: 70.0,
    desc: "Steamed pork dimsum served with chili garlic oil and calamansi.",
  },
  {
    sku: "K00-26",
    name: "Japanese Nori Siomai (4 pcs)",
    category: "Snacks & Dimsum",
    price: 85.0,
    desc: "Nori-wrapped pork dimsum served with chili garlic sauce and calamansi.",
  },
  {
    sku: "K00-27",
    name: "Siopao Special Asado",
    category: "Snacks & Dimsum",
    price: 70.0,
    desc: "Steamed bun filled with savory pork asado and salted egg.",
  },
  {
    sku: "K00-28",
    name: "Spaghetti Longganisa Pasta",
    category: "Snacks & Dimsum",
    price: 140.0,
    desc: "Filipino-style sweet spaghetti with ground savory longganisa and grated cheese.",
  },
  {
    sku: "K00-30",
    name: "Fresh Brick-Oven Style Pizza (10\")",
    category: "Snacks & Dimsum",
    price: 240.0,
    desc: "10-inch thin crust pizza with pepperoni and melted mozzarella cheese.",
  },
  {
    sku: "00-30",
    name: "Fresh Carabao Mango Shake",
    category: "Beverages & Shakes",
    price: 130.0,
    isPopular: true,
    desc: "Blended ripe mango with milk and ice.",
  },
  {
    sku: "00-31",
    name: "Fresh Strawberry Shake",
    category: "Beverages & Shakes",
    price: 130.0,
    desc: "Blended strawberry shake with milk and ice.",
  },
  {
    sku: "00-40",
    name: "Pocari Sweat Ion Supply (500ml)",
    category: "Beverages & Shakes",
    price: 70.0,
    isPopular: true,
    desc: "Chilled electrolyte sports drink (500ml).",
  },
  {
    sku: "00-37",
    name: "Gatorade Blue Bolt (500ml)",
    category: "Beverages & Shakes",
    price: 75.0,
    desc: "Chilled electrolyte sports drink (500ml).",
  },
  {
    sku: "00-26",
    name: "Lychee Lemon Cooler",
    category: "Beverages & Shakes",
    price: 110.0,
    desc: "Chilled beverage with lychee and lemon.",
  },
  {
    sku: "00-33",
    name: "Coke Classic (330ml Can)",
    category: "Beverages & Shakes",
    price: 55.0,
    desc: "Chilled canned Coca-Cola (330ml).",
  },
  {
    sku: "00-32",
    name: "Bottled Mineral Water (500ml)",
    category: "Beverages & Shakes",
    price: 30.0,
    desc: "Bottled drinking water (500ml), chilled or room temperature.",
  },
];

interface ViewDeckMenuModalProps {
  triggerClassName?: string;
  buttonText?: string;
}

export function ViewDeckMenuModal({
  triggerClassName = "w-full",
  buttonText = "Explore Menu →",
}: ViewDeckMenuModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"menu" | "venue_rental">("menu");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [rentalHours, setRentalHours] = useState<number>(2);
  const [withAddtlChairs, setWithAddtlChairs] = useState<boolean>(false);

  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const categories = ["All", "Coffee & Espresso", "Meals & Silog", "Snacks & Dimsum", "Beverages & Shakes"];

  const filteredItems = useMemo(() => {
    return VIEWDECK_MENU_ITEMS.filter((item) => {
      const matchCat = activeCategory === "All" || item.category === activeCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });
  }, [activeCategory, searchQuery]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    playHapticSound("tap");
    setIsOpen(true);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseLeave={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#071E4B]/80 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Dialog Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#E2E8F0] p-5 sm:p-8 z-10 text-[#102A56] max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full text-[#64748B] hover:text-[#0B2A67] hover:bg-[#F5F7FA] transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pb-5 border-b border-[#E2E8F0]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD21C]/20 text-[#0B2A67] text-xs font-bold uppercase tracking-wider">
            <Utensils className="w-3.5 h-3.5 text-[#bf050b]" />
            <span>View Deck Dining &amp; Espresso Lounge</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B2A67] tracking-tight">
            Authentic Arena Menu &amp; Refreshments
          </h3>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-xl mx-auto">
            Enjoy meals, espresso, and refreshments overlooking Courts 1 &amp; 2.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-[#64748B] pt-1">
            <span className="flex items-center gap-1 font-semibold text-[#0B2A67]">
              <Clock className="w-3.5 h-3.5 text-[#FFD21C]" />
              Open Daily 6:00 AM – 12:00 AM
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#bf050b]" />
              Dine-in, Courtside &amp; Take-out
            </span>
            <span>•</span>
            <span className="text-[#007d48] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Made Fresh to Order
            </span>
          </div>
        </div>

        {/* Navigation Tabs: Menu vs 5th-Floor Private Venue Rental */}
        <div className="flex items-center justify-center gap-2 p-1.5 bg-[#F5F7FA] rounded-2xl my-4 border border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => {
              playHapticSound("tap");
              setActiveTab("menu");
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "menu"
                ? "bg-[#0B2A67] text-white shadow-sm"
                : "text-[#64748B] hover:text-[#0B2A67] hover:bg-white"
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Consumable Menu (28 Items)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playHapticSound("tap");
              setActiveTab("venue_rental");
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "venue_rental"
                ? "bg-[#0B2A67] text-white shadow-sm"
                : "text-[#64748B] hover:text-[#0B2A67] hover:bg-white"
            }`}
          >
            <Building className="w-4 h-4 text-[#FFD21C]" />
            <span>5th-Flr Venue Rental (₱4K / 2-Hr)</span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-[#bf050b] text-white text-[9px] font-black uppercase tracking-wider">
              Consumable
            </span>
          </button>
        </div>

        {/* ========================================================
            TAB 1: 5TH-FLOOR PRIVATE VENUE RENTAL TAB
            ======================================================== */}
        {activeTab === "venue_rental" && (
          <div className="space-y-6 py-2 animate-in fade-in duration-200">
            {/* Top Showcase Hero Banner */}
            <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#071E4B] via-[#0B2A67] to-[#123A82] text-white p-6 sm:p-8 border border-white/10 shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFD21C]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-[#bf050b]/20 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#bf050b] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <Flame className="w-3 h-3 fill-current" />
                    Official Rate Card
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/10 text-[#FFD21C] text-[10px] font-bold uppercase tracking-wider border border-white/15">
                    5th Floor Level • City Lights View
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-white/15 pb-4">
                  <div>
                    <h4 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white">
                      View Deck Private Venue Rental
                    </h4>
                    <p className="text-xs sm:text-sm text-white/80 mt-1">
                      Overlooking Metro Manila city lights and Courts 1 &amp; 2 with dedicated elevator access.
                    </p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-3xl sm:text-4xl font-black text-[#FFD21C] tracking-tight">
                      ₱4,000
                    </div>
                    <span className="text-xs font-semibold text-white/80 block">
                      for 2 Hours <span className="text-[#FFD21C] font-bold">(Consumable)</span>
                    </span>
                    <span className="text-[11px] text-[#bf050b] bg-white font-bold px-2 py-0.5 rounded-full mt-1 inline-block">
                      +₱2,500 / addtl 1 hour
                    </span>
                  </div>
                </div>

                {/* 6 Core Verified Specifications Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 space-y-1">
                    <div className="flex items-center gap-1.5 text-[#FFD21C] font-bold">
                      <Layers className="w-4 h-4" />
                      <span>150-sqm Venue</span>
                    </div>
                    <p className="text-[11px] text-white/80">Spacious elevated floor area</p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 space-y-1">
                    <div className="flex items-center gap-1.5 text-[#FFD21C] font-bold">
                      <Users className="w-4 h-4" />
                      <span>25 Pax Capacity</span>
                    </div>
                    <p className="text-[11px] text-white/80">Ideal for private squad VIP events</p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 space-y-1">
                    <div className="flex items-center gap-1.5 text-[#FFD21C] font-bold">
                      <Wind className="w-4 h-4" />
                      <span>Fully Air-Conditioned</span>
                    </div>
                    <p className="text-[11px] text-white/80">Climate-controlled comfort</p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 space-y-1">
                    <div className="flex items-center gap-1.5 text-[#FFD21C] font-bold">
                      <Building className="w-4 h-4" />
                      <span>5th Flr Elevator Access</span>
                    </div>
                    <p className="text-[11px] text-white/80">Metro Manila city lights panorama</p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 space-y-1">
                    <div className="flex items-center gap-1.5 text-[#FFD21C] font-bold">
                      <Volume2 className="w-4 h-4" />
                      <span>Basic Sound System</span>
                    </div>
                    <p className="text-[11px] text-white/80">Included in the base package</p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 space-y-1">
                    <div className="flex items-center gap-1.5 text-[#FFD21C] font-bold">
                      <Car className="w-4 h-4" />
                      <span>15 Car Parking (24/7)</span>
                    </div>
                    <p className="text-[11px] text-white/80">Indoor parking with round-the-clock security</p>
                  </div>
                </div>

                {/* Consumable Highlight Callout */}
                <div className="p-3.5 rounded-xl bg-[#FFD21C]/20 border border-[#FFD21C]/40 text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFD21C] text-[#0B2A67] flex items-center justify-center shrink-0 font-bold">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-extrabold text-[#FFD21C] block">
                      100% Consumable Venue Rental
                    </span>
                    <span className="text-white/90 text-[11px]">
                      Your ₱4,000 venue fee is fully consumable on any of our 28 cafe food and drink items!
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Rental Duration Calculator */}
            <div className="bg-[#F5F7FA] rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h5 className="text-sm font-bold text-[#0B2A67] uppercase tracking-wide">
                    Select Rental Duration
                  </h5>
                  <p className="text-xs text-[#64748B]">
                    Base rate includes 2 hours. Additional hours are ₱2,500/hr.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {[2, 3, 4, 5, 6].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => {
                        playHapticSound("tap");
                        setRentalHours(hrs);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        rentalHours === hrs
                          ? "bg-[#0B2A67] text-white shadow-xs"
                          : "bg-white text-[#64748B] hover:text-[#0B2A67] border border-[#E2E8F0]"
                      }`}
                    >
                      {hrs} Hours
                    </button>
                  ))}
                </div>
              </div>

              {/* Rate Calculation Breakdown */}
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-2 text-xs">
                <div className="flex justify-between text-[#64748B]">
                  <span>2-Hour Base Rental (100% Consumable):</span>
                  <span className="font-bold text-[#0B2A67]">₱4,000.00</span>
                </div>
                {rentalHours > 2 && (
                  <div className="flex justify-between text-[#64748B]">
                    <span>Extension ({rentalHours - 2} hr{rentalHours - 2 > 1 ? "s" : ""} &times; ₱2,500):</span>
                    <span className="font-bold text-[#bf050b]">+₱{((rentalHours - 2) * 2500).toLocaleString()}.00</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#E2E8F0] flex justify-between items-baseline">
                  <span className="font-bold text-[#0B2A67]">Estimated Venue Total:</span>
                  <span className="text-xl font-black text-[#0B2A67]">
                    ₱{(4000 + Math.max(0, rentalHours - 2) * 2500).toLocaleString()}.00
                  </span>
                </div>
                <div className="text-[11px] text-[#007d48] font-bold flex items-center gap-1 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Includes ₱4,000 consumable credit for meals, espresso, and beverages</span>
                </div>
              </div>

              {/* Addtl Tables & Chairs Rental Note */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">💝</span>
                  <div>
                    <span className="font-bold block">Need Extra Seating?</span>
                    <span className="text-[11px] text-amber-800">Additional tables and chairs are available for rent upon request.</span>
                  </div>
                </div>
                <span className="px-2 py-1 rounded bg-amber-200/60 font-bold text-[10px] uppercase shrink-0">
                  Available On Request
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <a
                  href="tel:09766623453"
                  className="w-full sm:flex-1 h-11 rounded-xl bg-[#0B2A67] hover:bg-[#123A82] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Phone className="w-4 h-4 text-[#FFD21C]" />
                  <span>Call to Book View Deck: 0976-662-3453</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    playHapticSound("tap");
                    setActiveTab("menu");
                  }}
                  className="w-full sm:w-auto px-5 h-11 rounded-xl bg-white hover:bg-[#F5F7FA] text-[#0B2A67] border border-[#E2E8F0] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Utensils className="w-4 h-4 text-[#bf050b]" />
                  <span>Browse Cafe Menu</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: CONSUMABLE CAFE MENU (28 ITEMS)
            ======================================================== */}
        {activeTab === "menu" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Clickable Consumable Teaser Banner */}
            <div
              onClick={() => {
                playHapticSound("tap");
                setActiveTab("venue_rental");
              }}
              className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#0B2A67] to-[#071E4B] text-white flex flex-col sm:flex-row items-center justify-between gap-3 cursor-pointer hover:shadow-md transition-all group border border-white/10"
            >
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="w-10 h-10 rounded-xl bg-[#FFD21C] text-[#0B2A67] flex items-center justify-center shrink-0 font-bold shadow-xs">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="font-extrabold text-xs sm:text-sm text-white">
                      5th-Floor Private Venue Rental &bull; ₱4,000 / 2-Hr
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#bf050b] text-white text-[9px] font-black uppercase tracking-wider">
                      Consumable
                    </span>
                  </div>
                  <p className="text-[11px] text-white/80">
                    150 sqm &bull; 25 pax capacity &bull; City lights view &bull; Elevator access &bull; Sound system &bull; 100% consumable on this menu!
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#FFD21C] group-hover:translate-x-1 transition-transform shrink-0 flex items-center gap-1">
                <span>View Venue Specs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* High-res Venue Photo Banner */}
            <div className="relative w-full h-32 sm:h-40 rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-sm">
              <Image
                src="/service-viewdeck.jpg"
                alt="C&J View Deck Dining Lounge"
                fill
                sizes="(max-width: 896px) 100vw, 896px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071E4B]/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white text-xs">
                <span className="font-bold drop-shadow-md">
                  Overlooking Courts 1 &amp; 2 • High-Speed Arena Wi-Fi
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#bf050b] font-bold text-[10px] uppercase">
                  Fresh Menu Daily
                </span>
              </div>
            </div>

            {/* Search and Category Filters */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:flex-1">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search menu items (e.g. Spanish Latte, Tapsilog, Long Black)..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-full border border-[#E2E8F0] bg-[#F5F7FA] text-[#102A56] placeholder:text-[#64748B] focus:outline-none focus:border-[#0B2A67] focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B] hover:text-[#0B2A67] cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="text-xs text-[#64748B] font-bold shrink-0">
                  Showing {filteredItems.length} of {VIEWDECK_MENU_ITEMS.length} SKUs
                </div>
              </div>

              {/* Category Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      playHapticSound("tap");
                      setActiveCategory(cat);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeCategory === cat
                        ? "bg-[#0B2A67] text-white shadow-xs"
                        : "bg-[#F5F7FA] text-[#64748B] hover:bg-[#EDF4FC] hover:text-[#0B2A67]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
              {filteredItems.map((item) => (
                <div
                  key={item.sku}
                  className="p-3.5 sm:p-4 rounded-2xl border border-[#E2E8F0] bg-white hover:border-[#0B2A67]/30 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  {item.image && (
                    <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden mb-3 bg-slate-100">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 300px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold text-[#64748B] bg-[#F5F7FA] px-1.5 py-0.5 rounded">
                        SKU {item.sku}
                      </span>
                      {item.isPopular && (
                        <span className="px-2 py-0.5 rounded-full bg-[#bf050b] text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Flame className="w-2.5 h-2.5 fill-current" />
                          Popular
                        </span>
                      )}
                    </div>

                    <h4 className="font-extrabold text-sm text-[#0B2A67] pt-0.5">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-[#64748B] line-clamp-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#F5F7FA] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#64748B] font-medium">
                      {item.category}
                    </span>
                    <span className="font-black text-sm text-[#0B2A67]">
                      ₱{item.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              {filteredItems.length === 0 && (
                <div className="col-span-full py-12 text-center text-xs text-[#64748B] space-y-2">
                  <Utensils className="w-8 h-8 text-[#64748B]/40 mx-auto" />
                  <p>No dishes found matching your query.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hotline & Table Ordering Footer Strip */}
        <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#EDF4FC] p-4 rounded-2xl">
          <div className="space-y-0.5 text-center sm:text-left">
            <span className="text-xs font-bold text-[#0B2A67] block">
              View Deck Food, Cafe &amp; 5th-Floor Private Venue Inquiries
            </span>
            <span className="text-[11px] text-[#64748B]">
              Order courtside meals, reserve the 5th-floor private venue, or request additional tables &amp; chairs.
            </span>
          </div>
          <a
            href="tel:09766623453"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0B2A67] text-white hover:bg-[#123A82] text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5 text-[#FFD21C]" />
            <span>Call Hotline: 0976-662-3453</span>
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Button
        variant="yellow"
        onClick={handleOpen}
        className={triggerClassName}
      >
        <span>{buttonText}</span>
      </Button>

      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  );
}
