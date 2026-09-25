import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpDown,
  Filter,
  MessageCircle,
  Search,
  X,
  Phone,
  Mail,
  Youtube,
  Instagram,
} from "lucide-react";
import { useMemo, useState } from "react";

import { FilterPanel } from "@/components/catalogue/FilterPanel";
import { ListingCard } from "@/components/catalogue/ListingCard";
import { ListingDialog } from "@/components/catalogue/ListingDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Listing } from "@/data/listings";
import {
  SORT_OPTIONS,
  emptyFilters,
  selectCatalogue,
  type Filters,
  type SortKey,
} from "@/lib/catalogue";

const TITLE = "Used Japanese & Korean Engines Wholesale | Miami Motors Sharjah";
const DESC =
  "Browse 228+ used Toyota, Nissan, Mitsubishi, Hyundai engines, half cuts and gearboxes for bulk export from Sharjah UAE. Filter by make, model, fuel and enquire on WhatsApp.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalogue,
});

const COMPANY_WHATSAPP = "https://wa.me/971508997740";

function Catalogue() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inquiryCart, setInquiryCart] = useState<string[]>([]);

  const toggleInquiry = (id: string) => {
    setInquiryCart((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkInquiry = () => {
    const selectedListings = inquiryCart
      .map((id) => selectCatalogue(emptyFilters).results.find((l) => l.id === id))
      .filter(Boolean);

    let message = `Hello Miami Motors, I am interested in requesting a bulk quote for the following ${inquiryCart.length} items:\n\n`;
    selectedListings.forEach((l, i) => {
      message += `${i + 1}. ${l?.make} ${l?.code} (${l?.displacement} ${l?.fuel}) - Ref: ${l?.id}\n`;
    });

    window.open(`${COMPANY_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const data = useMemo(() => selectCatalogue(filters), [filters]);

  const chips: { label: string; group: string; onRemove: () => void }[] = [
    ...(filters.q
      ? [
          {
            label: `“${filters.q}”`,
            group: "Search",
            onRemove: () => setFilters({ ...filters, q: "" }),
          },
        ]
      : []),
    ...filters.makes.map((m) => ({
      label: m,
      group: "Make",
      onRemove: () =>
        setFilters({ ...filters, makes: filters.makes.filter((x) => x !== m), models: [] }),
    })),
    ...filters.categories.map((c) => ({
      label: c,
      group: "Category",
      onRemove: () =>
        setFilters({ ...filters, categories: filters.categories.filter((x) => x !== c) }),
    })),
    ...filters.fuels.map((f) => ({
      label: f,
      group: "Fuel",
      onRemove: () => setFilters({ ...filters, fuels: filters.fuels.filter((x) => x !== f) }),
    })),
    ...filters.models.map((m) => ({
      label: m,
      group: "Model",
      onRemove: () => setFilters({ ...filters, models: filters.models.filter((x) => x !== m) }),
    })),
  ];

  const panel = (
    <FilterPanel
      filters={filters}
      setFilters={setFilters}
      allMakes={data.allMakes}
      makeCounts={data.makeCounts}
      categoryCounts={data.categoryCounts}
      fuelCounts={data.fuelCounts}
      modelCounts={data.modelCounts}
      modelOptions={data.modelOptions}
    />
  );

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <div className="bg-background border-b border-border/40 py-1.5 text-[11px] text-muted-foreground hidden sm:block">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <a
              href="tel:+971508997740"
              className="flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <Phone className="size-3.5" />
              971-508-997-740
            </a>
            <a
              href="mailto:sales@jdmmiamotors.com"
              className="flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <Mail className="size-3.5" />
              sales@jdmmiamotors.com
            </a>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://www.instagram.com/miamimotorsjdm/?hl=en"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-pink-500 transition-colors"
            >
              <Instagram className="size-3.5" />
              Instagram
            </a>
            <a
              href="https://youtube.com/@jdmmiamimotors7627"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-red-500 transition-colors"
            >
              <Youtube className="size-3.5" />
              @jdmmiamimotors7627
            </a>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/logo.png"
              alt="Miami Motors"
              className="h-10 sm:h-12 w-auto shrink-0 object-contain rounded bg-white p-1 shadow-sm"
            />
            <div className="min-w-0 hidden sm:block">
              <p className="truncate font-display text-lg font-bold uppercase leading-none tracking-wide text-foreground">
                Miami Motors
              </p>
              <p className="truncate text-[10px] text-muted-foreground mt-1">
                Used Auto Spare Parts Trading Co. LLC · Sharjah, UAE
              </p>
            </div>
          </div>
          <Button
            asChild
            variant="whatsapp"
            size="sm"
            className="rounded-full shadow-lg shadow-whatsapp/20 font-bold tracking-wide sm:px-6 sm:h-10"
          >
            <a href={COMPANY_WHATSAPP} target="_blank" rel="noopener noreferrer">
              <svg
                viewBox="0 0 24 24"
                className="size-5 mr-2 fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              Chat on WhatsApp
            </a>
          </Button>
        </div>
      </header>

      <section className="border-b relative overflow-hidden bg-background">
        {/* Abstract background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background/50 to-background pointer-events-none" />

        <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 sm:py-24 relative z-10 flex flex-col items-center text-center">
          <Badge
            variant="outline"
            className="mb-6 text-primary border-primary/30 bg-primary/5 uppercase tracking-widest text-[10px] px-3 py-1 shadow-sm"
          >
            Worldwide Wholesale Export
          </Badge>
          <h1 className="max-w-4xl text-4xl font-black uppercase tracking-tight leading-[1.05] sm:text-6xl text-foreground">
            Premium Japanese & Korean Engines, <br className="hidden sm:block" />
            <span className="text-primary">Half Cuts & Gearboxes</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Directly from our Sharjah yard to Africa, the Gulf, South America, and Asia. Browse our
            massive container-ready inventory and contact us for bulk pricing.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4 sm:gap-6 text-xs">
            {[
              "Tested & Inspected",
              "Container Consolidation",
              "Worldwide Shipping",
              "Bulk Only",
            ].map((t) => (
              <span key={t} className="flex items-center gap-2 text-muted-foreground">
                <div className="size-1.5 rounded-full bg-primary/70" />
                <span className="label-caps">{t}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto flex max-w-[1600px] gap-8 px-4 py-6 sm:px-6">
        <aside className="sticky top-[76px] hidden h-[calc(100vh-96px)] w-72 shrink-0 overflow-y-auto pr-1 lg:block">
          {panel}
        </aside>

        <div className="min-w-0 flex-1">
          {/* Main search bar for mobile and desktop visibility */}
          <div className="mb-6 relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              placeholder="Search code, make or model…"
              aria-label="Search listings"
              className="pl-12 h-12 text-base rounded-full border-border bg-card shadow-sm focus-visible:ring-primary"
            />
            {filters.q && (
              <button
                type="button"
                onClick={() => setFilters({ ...filters, q: "" })}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium">
              Showing <span className="font-mono">{data.results.length}</span> of{" "}
              <span className="font-mono">{data.total}</span> listings
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <Filter className="size-4" /> Filters
                    {chips.length > 0 && (
                      <span className="ml-1 rounded bg-primary px-1.5 text-xs text-primary-foreground">
                        {chips.length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto">
                  <SheetTitle className="label-caps mb-4 text-sm">Filter inventory</SheetTitle>
                  {panel}
                </SheetContent>
              </Sheet>

              <Select
                value={filters.sort}
                onValueChange={(v) => setFilters({ ...filters, sort: v as SortKey })}
              >
                <SelectTrigger className="w-[190px]" aria-label="Sort listings">
                  <ArrowUpDown className="size-4 opacity-60" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-lg border bg-card p-2">
              {chips.map((c) => (
                <button
                  key={`${c.group}-${c.label}`}
                  type="button"
                  onClick={c.onRemove}
                  className="flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs transition-colors hover:border-destructive hover:text-destructive"
                >
                  <span className="text-muted-foreground">{c.group}:</span>
                  {c.label}
                  <X className="size-3" />
                </button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 text-xs"
                onClick={() => setFilters({ ...emptyFilters, sort: filters.sort })}
              >
                Reset all
              </Button>
            </div>
          )}

          {data.results.length === 0 ? (
            <div className="mt-10 rounded-lg border border-dashed p-10 text-center">
              <h2 className="text-xl font-semibold">No listings match these filters</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try removing a filter, or send us a WhatsApp enquiry — stock arrives weekly.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => setFilters({ ...emptyFilters, sort: filters.sort })}
              >
                Reset all filters
              </Button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {data.results.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  onOpen={() => setSelected(l)}
                  inInquiryCart={inquiryCart.includes(l.id)}
                  onToggleInquiry={toggleInquiry}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {inquiryCart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-2 border-t bg-background/95 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-2 sm:px-6">
            <div>
              <p className="font-semibold">{inquiryCart.length} items selected</p>
              <p className="hidden text-sm text-muted-foreground sm:block">
                Ready to request your wholesale quote?
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setInquiryCart([])}>
                Clear
              </Button>
              <Button variant="whatsapp" onClick={handleBulkInquiry}>
                <MessageCircle className="mr-2 size-4" />
                Request Bulk Quote
              </Button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-10 border-t bg-steel text-steel-foreground">
        <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <div>
            <p className="font-display text-lg font-bold uppercase">Miami Motors</p>
            <p className="mt-1 text-sm text-steel-foreground/70">
              Used Auto Spare Parts Trading Co. LLC — Industrial Area, Sharjah, United Arab
              Emirates.
            </p>
          </div>
          <div className="text-sm text-steel-foreground/70">
            <p className="label-caps mb-2 text-xs text-steel-foreground">Export markets</p>
            <p>Africa · Gulf · South America · Asia</p>
          </div>
          <div>
            <p className="label-caps mb-2 text-xs">Wholesale enquiries</p>
            <Button asChild variant="whatsapp" size="sm">
              <a href={COMPANY_WHATSAPP} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" /> WhatsApp us
              </a>
            </Button>
          </div>
        </div>
      </footer>

      <ListingDialog listing={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
