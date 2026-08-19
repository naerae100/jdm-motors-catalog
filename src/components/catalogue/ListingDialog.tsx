import { Facebook, Instagram, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Listing } from "@/data/listings";
import { whatsappLink } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

export function ListingDialog({
  listing,
  onClose,
}: {
  listing: Listing | null;
  onClose: () => void;
}) {
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [listing?.id]);

  if (!listing) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-3xl">
            {listing.make} {listing.code}
          </DialogTitle>
          <DialogDescription>
            Used {listing.category.toLowerCase()} · {listing.displacement} {listing.fuel} · Ref{" "}
            {listing.id}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border bg-muted">
              <img
                src={listing.images[active]}
                alt={`${listing.make} ${listing.code} photo ${active + 1}`}
                width={1024}
                height={768}
                className="aspect-video w-full object-cover"
              />
            </div>
            {listing.images.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {listing.images.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Show photo ${i + 1}`}
                    className={cn(
                      "size-20 overflow-hidden rounded border",
                      i === active
                        ? "border-primary ring-2 ring-primary"
                        : "opacity-70 hover:opacity-100 transition-opacity",
                    )}
                  >
                    <img src={src} alt="" loading="lazy" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <dl className="divide-y rounded-lg border text-sm">
              {[
                ["Make", listing.make],
                ["Engine code", listing.code],
                ["Category", listing.category],
                ["Fuel", listing.fuel],
                ["Displacement", listing.displacement],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-3 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>

            {listing.models && listing.models.length > 0 && (
              <div>
                <h4 className="label-caps mb-2 text-xs text-muted-foreground">Compatible models</h4>
                <div className="flex flex-wrap gap-1.5">
                  {listing.models.map((m) => (
                    <Badge key={m} variant="secondary">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Button asChild variant="whatsapp" className="w-full">
                <a href={whatsappLink(listing)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" /> Enquire on WhatsApp
                </a>
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="w-full text-blue-600 hover:text-blue-700"
                >
                  <a
                    href="https://www.facebook.com/jdmmiamimotors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Facebook className="size-4 mr-2" /> Facebook
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full text-pink-600 hover:text-pink-700"
                >
                  <a
                    href="https://www.instagram.com/miamimotorsjdm/?hl=en"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Instagram className="size-4 mr-2" /> Instagram
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Bulk orders only · container loading from Sharjah, UAE · worldwide shipping.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
