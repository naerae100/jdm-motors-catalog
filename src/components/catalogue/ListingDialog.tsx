import { Download, Facebook, FileText, Instagram, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import JSZip from "jszip";
import { saveAs } from "file-saver";

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
import { generateSpecSheet } from "@/lib/pdf";
import { cn } from "@/lib/utils";

export function ListingDialog({
  listing,
  onClose,
}: {
  listing: Listing | null;
  onClose: () => void;
}) {
  const [active, setActive] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => setActive(0), [listing?.id]);

  const handleDownloadAll = async () => {
    if (!listing) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const folderName = `${listing.make}_${listing.code}`.replace(/\s+/g, "_");
      const folder = zip.folder(folderName);

      if (!folder) throw new Error("Could not create zip folder");

      const promises = listing.images.map(async (src, i) => {
        const response = await fetch(src);
        const blob = await response.blob();

        // Extract original extension or default to jpg
        const ext = src.split(".").pop()?.split("?")[0] || "jpg";
        folder.file(`${folderName}_photo_${i + 1}.${ext}`, blob);
      });

      await Promise.all(promises);

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `MiamiMotors_${folderName}.zip`);
    } catch (error) {
      console.error("Error zipping images:", error);
      alert("There was an error downloading the images. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

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
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Photos ({listing.images.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleDownloadAll}
                disabled={isDownloading}
              >
                <Download className="size-3 mr-2" />
                {isDownloading ? "Zipping..." : "Save All (ZIP)"}
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border bg-muted">
              <Zoom>
                <img
                  src={listing.images[active]}
                  alt={`${listing.make} ${listing.code} photo ${active + 1}`}
                  width={1024}
                  height={768}
                  className="aspect-video w-full object-cover"
                />
              </Zoom>
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
              <Button
                variant="outline"
                className="w-full font-semibold"
                onClick={() => generateSpecSheet(listing)}
              >
                <FileText className="size-4 mr-2 text-muted-foreground" />
                Download PDF Specs
              </Button>
              <div className="grid grid-cols-2 gap-2 pt-2">
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
