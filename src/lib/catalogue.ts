import { listings, type Listing } from "@/data/listings";

export type SortKey = "make" | "code" | "displacement" | "photos";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "make", label: "Make (A–Z)" },
  { value: "code", label: "Engine code (A–Z)" },
  { value: "displacement", label: "Largest displacement" },
  { value: "photos", label: "Most photos" },
];

export const CATEGORIES = ["Engine", "Half Cut", "Gearbox", "Complete Car"] as const;
export const FUELS = ["Diesel", "Petrol"] as const;

export interface Filters {
  q: string;
  makes: string[];
  categories: string[];
  fuels: string[];
  models: string[];
  sort: SortKey;
}

export const emptyFilters: Filters = {
  q: "",
  makes: [],
  categories: [],
  fuels: [],
  models: [],
  sort: "make",
};

const litres = (d: string) => parseFloat(d) || 0;

function matchesText(l: Listing, q: string) {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  return (
    l.code.toLowerCase().includes(needle) ||
    l.make.toLowerCase().includes(needle) ||
    l.displacement.toLowerCase().includes(needle) ||
    l.models.some((m) => m.toLowerCase().includes(needle))
  );
}

/** Counts for one facet computed with every OTHER facet applied. */
function countBy(base: Listing[], key: (l: Listing) => string[] | string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of base) {
    const v = key(l);
    for (const k of Array.isArray(v) ? v : [v]) out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function selectCatalogue(f: Filters) {
  const textOnly = listings.filter((l) => matchesText(l, f.q));

  const pass = {
    make: (l: Listing) => f.makes.length === 0 || f.makes.includes(l.make),
    category: (l: Listing) => f.categories.length === 0 || f.categories.includes(l.category),
    fuel: (l: Listing) => f.fuels.length === 0 || f.fuels.includes(l.fuel),
    model: (l: Listing) => f.models.length === 0 || l.models.some((m) => f.models.includes(m)),
  };

  const results = textOnly.filter(
    (l) => pass.make(l) && pass.category(l) && pass.fuel(l) && pass.model(l),
  );

  const makeCounts = countBy(
    textOnly.filter((l) => pass.category(l) && pass.fuel(l) && pass.model(l)),
    (l) => l.make,
  );
  const categoryCounts = countBy(
    textOnly.filter((l) => pass.make(l) && pass.fuel(l) && pass.model(l)),
    (l) => l.category,
  );
  const fuelCounts = countBy(
    textOnly.filter((l) => pass.make(l) && pass.category(l) && pass.model(l)),
    (l) => l.fuel,
  );

  // Model dropdown depends on selected makes (and other facets).
  const modelScope = textOnly.filter((l) => pass.make(l) && pass.category(l) && pass.fuel(l));
  const modelCounts = countBy(modelScope, (l) => l.models);
  const modelOptions = Object.keys(modelCounts).sort((a, b) => a.localeCompare(b));

  const sorted = [...results].sort((a, b) => {
    switch (f.sort) {
      case "code":
        return a.code.localeCompare(b.code) || a.make.localeCompare(b.make);
      case "displacement":
        return litres(b.displacement) - litres(a.displacement) || a.make.localeCompare(b.make);
      case "photos":
        return b.images.length - a.images.length || a.make.localeCompare(b.make);
      default:
        return a.make.localeCompare(b.make) || a.code.localeCompare(b.code);
    }
  });

  const allMakes = Object.keys(countBy(listings, (l) => l.make)).sort((a, b) => a.localeCompare(b));

  return {
    results: sorted,
    total: listings.length,
    allMakes,
    makeCounts,
    categoryCounts,
    fuelCounts,
    modelCounts,
    modelOptions,
  };
}

export function whatsappLink(l: Listing) {
  const text = `Hello Miami Motors, I'm interested in a bulk quote for: ${l.make} ${l.code} ${l.displacement} ${l.fuel} ${l.category} (Ref ${l.id}). Please share availability, price and shipping to my port.`;
  return `https://wa.me/${l.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
