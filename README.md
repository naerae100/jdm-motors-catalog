# Engine Finder Pro

Build a professional B2B wholesale catalogue web app for a used-engine exporter.

Business: Miami Motors Used Auto Spare Parts Trading Co. LLC — a Sharjah/UAE company that exports Japanese & Korean used engines, half cuts, gearboxes and complete cars to bulk buyers worldwide (Africa, Gulf, South America, Asia). This is a browse-and-enquire catalogue, NOT an e-commerce store. No prices, no cart, no checkout. Every product's call-to-action is a WhatsApp enquiry.

Core purpose: Let wholesale buyers filter a large inventory fast, see product details, and message the company on WhatsApp for a bulk quote.

Data model — each listing has these fields:

make (e.g. Toyota, Nissan, Mitsubishi)

code (engine code, e.g. 2NZ, 4D56, YD25)

category (Engine, Half Cut, Gearbox, Complete Car)

fuel (Diesel or Petrol)

displacement (e.g. 2.5L)

models (array of compatible vehicles, e.g. ["Hilux","Prado","Fortuner"])

images (array of image file paths — use placeholder images for now)

whatsapp (phone number for the enquiry button)

postUrl (link to original source)

Seed it with realistic sample data across these makes and counts so I can see it populated: Toyota (68), Nissan (52), Mitsubishi (27), Hyundai (23), Mazda (19), Isuzu (18), Ford (7), Kia (5), Suzuki (4), Hino (4), Chevrolet (1). Mix of Diesel/Petrol, mostly Engines with some Half Cuts and Gearboxes. I'll replace the data with a real JSON file later, so keep the data in a single easily-swappable file/array.

Filtering & search (this is the most important part):

Live text search — matches engine code, make, or vehicle model (e.g. typing "Hilux" or "2NZ" filters instantly)

Filter by Make — multi-select, each showing a count of listings

Filter by Category — Engine / Half Cut / Gearbox / Complete Car, multi-select with counts

Filter by Fuel — Diesel / Petrol, with counts

Filter by compatible Model — a dropdown that dynamically updates based on selected makes (only show models available for the chosen brand)

Sort options — by make, by engine code, by largest displacement, by most photos

Active filter chips shown above results, each removable with an ×, plus a "Reset all" button

Result count always visible ("Showing 42 of 228 listings")

i want proper ctalaogue and all platform responsive, proper filters, like i can choose filter with brand, also brands and models, all proper filters

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5d84efaf-ddce-419c-bb16-c3865fdf2acc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
