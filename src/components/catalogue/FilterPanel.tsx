import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { CATEGORIES, FUELS, type Filters } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

interface Props {
  filters: Filters;
  setFilters: (f: Filters) => void;
  allMakes: string[];
  makeCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  fuelCounts: Record<string, number>;
  modelCounts: Record<string, number>;
  modelOptions: string[];
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FacetGroup({
  title,
  options,
  selected,
  counts,
  onToggle,
}: {
  title: string;
  options: readonly string[];
  selected: string[];
  counts: Record<string, number>;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="label-caps text-xs text-muted-foreground">{title}</h3>
      <div className="space-y-1">
        {options.map((opt) => {
          const count = counts[opt] ?? 0;
          const checked = selected.includes(opt);
          return (
            <label
              key={opt}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                checked && "bg-accent text-accent-foreground",
                count === 0 && !checked && "opacity-45",
              )}
            >
              <Checkbox checked={checked} onCheckedChange={() => onToggle(opt)} />
              <span className="flex-1 truncate">{opt}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{count}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function FilterPanel({
  filters,
  setFilters,
  allMakes,
  makeCounts,
  categoryCounts,
  fuelCounts,
  modelCounts,
  modelOptions,
}: Props) {
  const [modelOpen, setModelOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="label-caps text-xs text-muted-foreground">Compatible model</h3>
        <Popover open={modelOpen} onOpenChange={setModelOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between font-normal">
              <span className="truncate">
                {filters.models.length
                  ? `${filters.models.length} model${filters.models.length > 1 ? "s" : ""} selected`
                  : filters.makes.length
                    ? `Any ${filters.makes.join(", ")} model`
                    : "Any model"}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(20rem,90vw)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Find a model…" />
              <CommandList>
                <CommandEmpty>No matching model.</CommandEmpty>
                <CommandGroup>
                  {modelOptions.map((m) => (
                    <CommandItem
                      key={m}
                      value={m}
                      onSelect={() => setFilters({ ...filters, models: toggle(filters.models, m) })}
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4",
                          filters.models.includes(m) ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="flex-1">{m}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {modelCounts[m] ?? 0}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {filters.models.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {filters.models.map((m) => (
              <Badge
                key={m}
                variant="secondary"
                className="cursor-pointer gap-1"
                onClick={() => setFilters({ ...filters, models: toggle(filters.models, m) })}
              >
                {m} <X className="size-3" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />
      <FacetGroup
        title="Category"
        options={CATEGORIES}
        selected={filters.categories}
        counts={categoryCounts}
        onToggle={(v) => setFilters({ ...filters, categories: toggle(filters.categories, v) })}
      />
      <Separator />
      <FacetGroup
        title="Fuel"
        options={FUELS}
        selected={filters.fuels}
        counts={fuelCounts}
        onToggle={(v) => setFilters({ ...filters, fuels: toggle(filters.fuels, v) })}
      />
      <Separator />
      <FacetGroup
        title="Make / Brand"
        options={allMakes}
        selected={filters.makes}
        counts={makeCounts}
        onToggle={(v) =>
          setFilters({
            ...filters,
            makes: toggle(filters.makes, v),
            // Models are brand-scoped: drop selections that no longer apply.
            models: [],
          })
        }
      />
    </div>
  );
}
