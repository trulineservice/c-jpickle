import { Metadata } from "next";
import CoffeeMenuClient from "./coffee-menu-client";

export const metadata: Metadata = {
  title: "Specialty Coffee Menu • C&J View Deck Espresso Bar",
  description:
    "Explore freshly pulled espresso, iced Spanish lattes, seasalt cream cold foams, and decaf roasts handcrafted at C&J Events Place & View Deck in Taytay, Rizal.",
};

export default function MenuPage() {
  return <CoffeeMenuClient />;
}
