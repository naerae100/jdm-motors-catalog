import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Listing } from "@/data/listings";

export async function generateSpecSheet(listing: Listing) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text("MIAMI MOTORS", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Used Auto Spare Parts Trading Co. LLC", 14, 28);
  doc.text("Industrial Area, Sharjah, United Arab Emirates", 14, 34);
  doc.text("Phone/WhatsApp: +971-508-997-740", 14, 40);
  doc.text("Email: sales@jdmmiamotors.com", 14, 46);

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 52, 196, 52);

  // Listing Title
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(`Specification Sheet: ${listing.make} ${listing.code}`, 14, 64);
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Ref ID: ${listing.id}`, 14, 72);

  try {
    // Add main image if available
    const firstImage = listing.images[0];
    if (firstImage) {
      const img = new Image();
      img.src = firstImage;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      // Try to center and fit image nicely
      doc.addImage(img, "JPEG", 14, 80, 100, 75);
    }
  } catch (e) {
    console.warn("Failed to load image for PDF", e);
  }

  // Specifications Table
  autoTable(doc, {
    startY: 165,
    head: [["Specification", "Details"]],
    body: [
      ["Make", listing.make],
      ["Engine Code", listing.code],
      ["Category", listing.category],
      ["Fuel Type", listing.fuel],
      ["Displacement", listing.displacement],
      ["Compatible Models", listing.models.join(", ") || "N/A"],
    ],
    theme: "grid",
    headStyles: { fillColor: [40, 40, 40] },
    styles: { fontSize: 11, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50 },
    },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("This document is generated for bulk wholesale inquiry purposes.", 14, pageHeight - 15);

  // Save the PDF
  doc.save(`MiamiMotors_${listing.make}_${listing.code}_Specs.pdf`.replace(/\s+/g, "_"));
}
