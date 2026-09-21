"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Coffee,
  Sparkles,
  Flame,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Heart,
  Droplets,
  Zap,
  Info,
  Sliders,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CoffeeMenuItem {
  id: string;
  sku: string;
  name: string;
  subtitle: string;
  category: "iced" | "hot" | "decaf";
  price: number;
  image: string;
  isBestSeller?: boolean;
  isChefSpecial?: boolean;
  roastLevel: "Medium Dark" | "Dark Roast" | "Espresso Roast" | "Swiss Water Decaf";
  flavorNotes: string[];
  description: string;
  calories?: string;
  servingTemp: "Iced" | "Hot" | "Both";
}

export const COFFEE_MENU_CATALOG: CoffeeMenuItem[] = [
  {
    id: "spanish-latte",
    sku: "00-04",
    name: "Iced Spanish Latte",
    subtitle: "Sweet Condensed Milk & Bold Espresso",
    category: "iced",
    price: 145.0,
    image: "/coffee/spanish-latte.jpg",
    isBestSeller: true,
    roastLevel: "Espresso Roast",
    flavorNotes: ["Sweet Condensed Milk", "Creamy Whole Milk", "Dark Caramel", "Bold Crema"],
    description:
      "A crowd-favorite Filipino classic. Smooth sweetened condensed milk layered with chilled farm-fresh milk and topped with a freshly pulled double espresso float over crystal ice cubes.",
    calories: "190 kcal",
    servingTemp: "Iced",
  },
  {
    id: "seasalt-latte",
    sku: "00-05",
    name: "Seasalt Cream Latte",
    subtitle: "Artisanal Sea Salt Sweet Cold Foam",
    category: "iced",
    price: 150.0,
    image: "/coffee/seasalt-latte.jpg",
    isBestSeller: true,
    isChefSpecial: true,
    roastLevel: "Dark Roast",
    flavorNotes: ["Velvety Sea Salt Foam", "Dark Cocoa", "Sweet Cream", "Mineral Salt Crystals"],
    description:
      "Double espresso served over ice and crowned with a thick, decadent layer of hand-whipped sea salt sweet cream, dusted with coarse mineral salt flakes and roasted coffee powder.",
    calories: "210 kcal",
    servingTemp: "Iced",
  },
  {
    id: "caramel-macchiato",
    sku: "00-07",
    name: "Caramel Macchiato",
    subtitle: "Steamed Vanilla Milk & Criss-Cross Caramel",
    category: "hot",
    price: 150.0,
    image: "/coffee/caramel-macchiato.jpg",
    roastLevel: "Espresso Roast",
    flavorNotes: ["French Vanilla", "Golden Caramel Drizzle", "Frothy Microfoam", "Double Espresso"],
    description:
      "Velvety steamed milk infused with pure vanilla syrup, stained with freshly extracted espresso and crowned with a generous crosshatch drizzle of warm buttery caramel glaze.",
    calories: "220 kcal",
    servingTemp: "Both",
  },
  {
    id: "mocha-latte",
    sku: "00-10",
    name: "Artisan Iced Mocha",
    subtitle: "Decadent Chocolate Ganache & Espresso",
    category: "iced",
    price: 150.0,
    image: "/coffee/mocha-latte.jpg",
    isChefSpecial: true,
    roastLevel: "Dark Roast",
    flavorNotes: ["70% Dark Chocolate Ganache", "Cocoa Dust", "Creamy Espresso", "Chocolate Cold Foam"],
    description:
      "Rich artisanal dark chocolate syrup painted inside the glass, blended with espresso and milk, and topped with chocolate microfoam and fine Dutch cocoa powder.",
    calories: "230 kcal",
    servingTemp: "Both",
  },
  {
    id: "cappuccino",
    sku: "00-02",
    name: "Cappuccino Italiano",
    subtitle: "Silky Microfoam & Rosetta Latte Art",
    category: "hot",
    price: 130.0,
    image: "/coffee/cappuccino.jpg",
    roastLevel: "Medium Dark",
    flavorNotes: ["Equal 1:1:1 Balance", "Velvety Microfoam", "Golden Crema", "Light Cocoa Powder"],
    description:
      "The quintessential Italian morning cup. Balanced thirds of double espresso, rich steamed milk, and dense microfoam with handcrafted rosetta latte art and a light cocoa dust.",
    calories: "120 kcal",
    servingTemp: "Hot",
  },
  {
    id: "brown-sugar-latte",
    sku: "00-09",
    name: "Brown Sugar Latte",
    subtitle: "Caramelized Muscovado Tiger Stripes",
    category: "iced",
    price: 145.0,
    image: "/coffee/brown-sugar-latte.jpg",
    isBestSeller: true,
    roastLevel: "Medium Dark",
    flavorNotes: ["Muscovado Syrup", "Raw Demerara Sugar", "Tiger Stripes", "Fresh Dairy Milk"],
    description:
      "Slow-cooked caramelized brown sugar syrup creating tiger stripe drips along the glass, poured over fresh milk, ice, and rich espresso with a crunchy raw sugar topping.",
    calories: "205 kcal",
    servingTemp: "Iced",
  },
  {
    id: "long-black",
    sku: "00-01",
    name: "Long Black Espresso",
    subtitle: "Double Ristretto over Hot Spring Water",
    category: "hot",
    price: 110.0,
    image: "/coffee/long-black.jpg",
    roastLevel: "Medium Dark",
    flavorNotes: ["Unbroken Crema", "Nutty Hazelnut Aroma", "Dark Chocolate Finish", "Zero Sugar"],
    description:
      "Pure, unadulterated specialty coffee. Two shots of freshly extracted espresso poured gently over hot water, preserving the thick, hazelnut-colored aromatic crema intact.",
    calories: "5 kcal",
    servingTemp: "Both",
  },
  {
    id: "choco-hazelnut",
    sku: "00-11",
    name: "Choco Hazelnut Latte",
    subtitle: "Roasted Hazelnut Praline & Mocha Cream",
    category: "iced",
    price: 150.0,
    image: "/coffee/choco-hazelnut.jpg",
    isChefSpecial: true,
    roastLevel: "Dark Roast",
    flavorNotes: ["Crushed Roasted Hazelnuts", "Praline Cream", "Dark Mocha Swirl", "Espresso Float"],
    description:
      "A dessert-in-a-cup inspired by artisanal Italian pralines. Espresso blended with chocolate hazelnut syrup, topped with rich mocha cream and freshly crushed roasted hazelnuts.",
    calories: "245 kcal",
    servingTemp: "Both",
  },
  {
    id: "seasalt-butterscotch",
    sku: "00-20",
    name: "Seasalt Butterscotch (Decaf)",
    subtitle: "Swiss Water Decaf with Sweet Salt Foam",
    category: "decaf",
    price: 165.0,
    image: "/coffee/seasalt-butterscotch.jpg",
    roastLevel: "Swiss Water Decaf",
    flavorNotes: ["Golden Butterscotch", "Sea Salt Cream", "Crunchy Toffee Bits", "100% Caffeine-Free"],
    description:
      "Enjoy premium specialty coffee late into the evening without the jitters. Naturally decaffeinated espresso combined with rich golden butterscotch syrup and sea salt cream.",
    calories: "215 kcal",
    servingTemp: "Both",
  },
];

export default function CoffeeMenuClient() {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "iced" | "hot" | "decaf">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<CoffeeMenuItem | null>(null);

  // Customization state for detail preview
  const [customSweetness, setCustomSweetness] = useState<"100%" | "75%" | "50%" | "25%" | "0%">("100%");
  const [customMilk, setCustomMilk] = useState<"Whole Milk" | "Oat Milk (+₱30)" | "Almond Milk (+₱30)">("Whole Milk");
  const [customIce, setCustomIce] = useState<"Regular Ice" | "Less Ice" | "No Ice">("Regular Ice");

  const filteredItems = useMemo(() => {
    return COFFEE_MENU_CATALOG.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.subtitle.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.flavorNotes.some((n) => n.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#071530] text-foreground transition-colors pb-24">
      {/* 1. Header Hero Banner */}
      <section className="relative bg-[#0B2A67] text-white pt-16 pb-20 px-4 sm:px-8 border-b border-[#071E4B] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,210,28,0.12),transparent_60%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#123A82] border border-white/10 text-xs font-bold text-[#FFD21C]">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>5TH FLOOR VIEW DECK &bull; SPECIALTY ESPRESSO BAR</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                Freshly Pulled &amp; Handcrafted <span className="text-[#FFD21C]">Coffee Menu</span>
              </h1>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed font-medium">
                Experience our signature iced Spanish lattes, hand-whipped sea salt cream cold foams, and Swiss Water decaf roasts. Handcrafted daily while you watch matches from the 5th-floor view deck.
              </p>
            </div>

            {/* Quick Order Info Pill */}
            <div className="p-4 rounded-2xl bg-[#071E4B]/80 border border-white/10 flex items-center gap-4 text-xs shrink-0 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-[#FFD21C] text-[#0B2A67] flex items-center justify-center font-bold shrink-0">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-white">Barista Hours</p>
                <p className="text-white/70 text-[11px]">6:00 AM – 12:00 MN Daily</p>
                <p className="text-[#FFD21C] font-semibold text-[10px] mt-0.5">Order at Counter or Ground POS</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Menu Navigation & Category Filter */}
      <section className="sticky top-20 z-30 bg-white/95 dark:bg-[#071E4B]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10 px-4 sm:px-8 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: "all", label: "All Coffees", count: COFFEE_MENU_CATALOG.length },
              { id: "iced", label: "❄️ Iced Signatures", count: COFFEE_MENU_CATALOG.filter((c) => c.category === "iced").length },
              { id: "hot", label: "☕ Hot Classics", count: COFFEE_MENU_CATALOG.filter((c) => c.category === "hot").length },
              { id: "decaf", label: "🌙 Decaf Specialty", count: COFFEE_MENU_CATALOG.filter((c) => c.category === "decaf").length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  selectedCategory === tab.id
                    ? "bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-sm"
                    : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/80 hover:bg-slate-200 dark:hover:bg-white/20"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === tab.id
                    ? "bg-white/20 text-white dark:bg-[#0B2A67]/20 dark:text-[#0B2A67]"
                    : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coffee flavor or notes..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2A67] dark:focus:ring-[#FFD21C]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-foreground cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 3. Coffee Menu Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
          <div>
            <h2 className="text-xl font-black text-[#0B2A67] dark:text-white">
              {selectedCategory === "all"
                ? "Specialty Coffee Selection"
                : selectedCategory === "iced"
                ? "Signature Iced Lattes & Cold Foams"
                : selectedCategory === "hot"
                ? "Classic Hot Espresso Roasts"
                : "Swiss Water Decaffeinated Specialty"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Made with 100% Arabica &amp; Robusta blend roasted for maximum sweetness and crema
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:block">
            Showing {filteredItems.length} Handcrafted Coffees
          </span>
        </div>

        {/* The Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((coffee) => (
            <div
              key={coffee.id}
              onClick={() => {
                setSelectedItem(coffee);
                setCustomSweetness("100%");
                setCustomMilk("Whole Milk");
                setCustomIce("Regular Ice");
              }}
              className="group bg-white dark:bg-[#0c1a3b] rounded-3xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
            >
              {/* Image Container with Flavor Badge */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-black/40">
                <Image
                  src={coffee.image}
                  alt={coffee.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

                {/* Top Badges */}
                <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20">
                    SKU {coffee.sku}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {coffee.isBestSeller && (
                      <span className="px-2.5 py-1 rounded-full bg-[#bf050b] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <Flame className="w-3 h-3 fill-current" />
                        Best Seller
                      </span>
                    )}
                    {coffee.isChefSpecial && !coffee.isBestSeller && (
                      <span className="px-2.5 py-1 rounded-full bg-[#FFD21C] text-[#0B2A67] text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <Sparkles className="w-3 h-3 fill-current" />
                        Signature
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                  <span className="text-xs font-semibold text-white/90 drop-shadow">
                    {coffee.servingTemp} &bull; {coffee.roastLevel}
                  </span>
                  {coffee.calories && (
                    <span className="text-[11px] font-mono text-white/80 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                      {coffee.calories}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Content Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-lg font-black text-[#0B2A67] dark:text-white group-hover:text-[#bf050b] dark:group-hover:text-[#FFD21C] transition-colors">
                      {coffee.name}
                    </h3>
                    <span className="text-lg font-black text-[#bf050b] dark:text-[#FFD21C] shrink-0">
                      ₱{coffee.price.toFixed(2)}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {coffee.subtitle}
                  </p>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {coffee.description}
                  </p>
                </div>

                {/* Flavor Notes Chips */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    Flavor Notes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {coffee.flavorNotes.map((note) => (
                      <span
                        key={note}
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EDF4FC] dark:bg-white/10 text-[#0B2A67] dark:text-[#FFD21C]"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold group-hover:text-[#0B2A67] dark:group-hover:text-white flex items-center gap-1 transition-colors">
                    <span>Customize &amp; Notes</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#0B2A67] dark:bg-[#FFD21C] text-white dark:text-[#0B2A67] font-extrabold text-[11px]">
                    View
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Interactive Flavor Customization & Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#071530] rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-white/15 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header Bar */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900 shrink-0">
              <Image
                src={selectedItem.image}
                alt={selectedItem.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071530] via-[#071530]/40 to-transparent" />

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-[#FFD21C] bg-[#0B2A67] px-2.5 py-0.5 rounded-full">
                    SKU {selectedItem.sku} &bull; {selectedItem.servingTemp}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mt-1.5">
                    {selectedItem.name}
                  </h3>
                  <p className="text-xs text-white/80 font-medium">{selectedItem.subtitle}</p>
                </div>
                <span className="text-2xl sm:text-3xl font-black text-[#FFD21C] drop-shadow-md">
                  ₱{selectedItem.price.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* Detailed Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Coffee Story &amp; Blend
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedItem.description}
                </p>
              </div>

              {/* Flavor Profile Palette */}
              <div className="space-y-2 p-4 rounded-2xl bg-[#EDF4FC] dark:bg-[#0c1a3b] border border-[#d2e4f7] dark:border-white/10">
                <div className="flex items-center gap-2 text-xs font-black text-[#0B2A67] dark:text-[#FFD21C]">
                  <Sparkles className="w-4 h-4" />
                  <span>CUPPING TASTE PROFILE</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedItem.flavorNotes.map((note) => (
                    <span
                      key={note}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-white dark:bg-[#071530] text-[#0B2A67] dark:text-white border border-[#0B2A67]/10"
                    >
                      {note}
                    </span>
                  ))}
                </div>
              </div>

              {/* Interactive Customizations */}
              <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-white/10">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#0B2A67] dark:text-white flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#FFD21C]" />
                  <span>Barista Preparation Preferences</span>
                </h4>

                {/* Sweetness Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Sweetness Level
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {(["100%", "75%", "50%", "25%", "0%"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setCustomSweetness(level)}
                        className={`py-2 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${
                          customSweetness === level
                            ? "bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] border-transparent"
                            : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-white border-slate-200 dark:border-white/10"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Milk Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Milk Option
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Whole Milk", "Oat Milk (+₱30)", "Almond Milk (+₱30)"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCustomMilk(m)}
                        className={`py-2 px-2 text-xs font-extrabold rounded-xl border transition-all cursor-pointer truncate ${
                          customMilk === m
                            ? "bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] border-transparent"
                            : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-white border-slate-200 dark:border-white/10"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order at Counter Banner */}
              <div className="p-4 rounded-2xl bg-[#071E4B] text-white flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FFD21C] block">
                    Ready to Order?
                  </span>
                  <p className="text-xs text-white/90">
                    Tell the cashier or barista: <strong>SKU {selectedItem.sku} ({selectedItem.name}, {customSweetness} sweet, {customMilk})</strong>
                  </p>
                </div>
                <Link href="/cashier">
                  <Button size="sm" className="bg-[#FFD21C] hover:bg-[#e6bb14] text-[#0B2A67] font-black text-xs shrink-0 rounded-full px-4">
                    POS Terminal
                  </Button>
                </Link>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0c1a3b] flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                100% Consumable under View Deck rental credit
              </span>
              <Button
                variant="outline"
                onClick={() => setSelectedItem(null)}
                className="rounded-full text-xs font-bold"
              >
                Close Menu Item
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. View Deck Rental & Court Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 mt-16">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#0B2A67] to-[#071E4B] text-white flex flex-col md:flex-row items-center justify-between gap-8 border border-white/10 shadow-xl relative overflow-hidden">
          <div className="space-y-3 max-w-xl">
            <span className="px-3 py-1 rounded-full bg-[#FFD21C] text-[#0B2A67] font-black text-[10px] uppercase tracking-wider inline-block">
              5th Floor Skyline Dining
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Enjoy Specialty Espresso Overlooking the Courts
            </h3>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Book our private 25-pax View Deck for only ₱4,000 (2 hours), with 100% consumable credit towards our handcrafted espresso menu, fruit shakes, and silog meals.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
            <Link href="/book" className="w-full sm:w-auto">
              <Button className="w-full h-11 px-6 rounded-full bg-[#FFD21C] hover:bg-[#e6bb14] text-[#0B2A67] font-black text-xs">
                Reserve Court Slot
              </Button>
            </Link>
            <a href="tel:09766623453" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full h-11 px-6 rounded-full border-white/30 text-white hover:bg-white/10 font-bold text-xs">
                Call View Deck: 0976-662-3453
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
