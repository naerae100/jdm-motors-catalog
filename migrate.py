import csv
import json
import os
import re

csv_file = 'jdm-images/catalog.csv'
output_file = 'src/data/listings.ts'

listings = []

def clean_value(v):
    v = v.strip()
    if v.upper() in ["N/A", "UNKNOWN", ""]:
        return ""
    return v

with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        folder = row.get('folder', '')
        make = clean_value(row.get('make', ''))
        
        # Fallback to "Other" if make is empty
        if not make:
            make = "Other"
            
        code = clean_value(row.get('code', ''))
        category = clean_value(row.get('category', ''))
        fuel = clean_value(row.get('fuel', ''))
        displacement = clean_value(row.get('displacement', ''))
        
        # Safe int parse
        try:
            images_saved = int(row.get('images_saved', '0'))
        except ValueError:
            images_saved = 0
            
        post_url = row.get('post_url', '')

        # Construct image array with img_01.jpg format
        images = []
        for img_idx in range(1, images_saved + 1):
            images.append(f"/images/inventory/{folder}/img_{img_idx:02d}.jpg")
        
        if category == "HalfCut":
            category = "Half Cut"
        elif category == "CompleteCar":
            category = "Complete Car"
            
        listings.append({
            "id": f"JDM-{i+1:03d}",
            "make": make,
            "code": code,
            "category": category,
            "fuel": fuel,
            "displacement": displacement,
            "models": [],
            "images": images,
            "whatsapp": "971-508-997-740",
            "postUrl": post_url
        })

# Collect unique categories and fuels to generate TS types
categories = sorted(list(set(l['category'] for l in listings if l['category'])))
fuels = sorted(list(set(l['fuel'] for l in listings if l['fuel'])))

# If empty, add fallbacks
if not categories: categories = ["Engine"]
if not fuels: fuels = ["Petrol", "Diesel"]

ts_content = f"""// Auto-generated from catalog.csv
export type Category = {" | ".join(f'"{c}"' for c in categories)} | string;
export type Fuel = {" | ".join(f'"{f}"' for f in fuels)} | string;

export interface Listing {{
  id: string;
  make: string;
  code: string;
  category: Category;
  fuel: Fuel;
  displacement: string;
  models: string[];
  images: string[];
  whatsapp: string;
  postUrl: string;
}}

export const listings: Listing[] = {json.dumps(listings, indent=2)};
"""

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"Generated {len(listings)} listings in {output_file}")
