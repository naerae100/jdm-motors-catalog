import { Facebook, Images, Instagram, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Listing } from "@/data/listings";
import { whatsappLink } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

export function ListingCard({ listing, onOpen }: { listing: Listing; onOpen: () => void }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-panel transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/60">
      <button
        type="button"
        onClick={onOpen}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-muted text-left"
        aria-label={`View details for ${listing.make} ${listing.code}`}
      >
        <img
          src={listing.images[0]}
          alt={`${listing.make} ${listing.code} ${listing.displacement} used ${listing.category.toLowerCase()}`}
          loading="lazy"
          width={1024}
          height={768}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-2 top-2 rounded bg-steel/90 px-2 py-0.5 text-[11px] label-caps text-steel-foreground">
          {listing.category}
        </span>
        {listing.images.length > 1 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-steel/85 px-1.5 py-0.5 text-[11px] text-steel-foreground">
            <Images className="size-3" /> {listing.images.length}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div>
          <p className="label-caps text-[11px] text-muted-foreground">{listing.make}</p>
          <h3 className="text-xl font-semibold leading-tight">
            {listing.code}
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {listing.displacement}
            </span>
          </h3>
        </div>

        {listing.models && listing.models.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">Fits:</span>
            {listing.models.map((m) => (
              <Badge
                key={m}
                variant="outline"
                className={cn(
                  "px-1.5 py-0 font-normal opacity-80",
                  "bg-transparent border-muted-foreground/30",
                )}
              >
                {m}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "border-current/30",
              listing.fuel === "Diesel" ? "text-diesel" : "text-petrol",
            )}
          >
            {listing.fuel}
          </Badge>
          <span className="font-mono text-[11px] text-muted-foreground">{listing.id}</span>
        </div>

        <div className="mt-auto flex gap-2">
          <Button asChild variant="whatsapp" size="sm" className="flex-1">
            <a href={whatsappLink(listing)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" /> Enquire
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={onOpen}>
            Details
          </Button>
          <div className="flex items-center gap-1 border-l pl-2 ml-1 border-border">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-blue-600"
              aria-label="Facebook"
            >
              <a
                href="https://www.facebook.com/jdmmiamimotors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="size-4" />
              </a>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-pink-600"
              aria-label="Instagram"
            >
              <a
                href="https://www.instagram.com/miamimotorsjdm/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="size-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
