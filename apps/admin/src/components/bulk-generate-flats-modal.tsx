"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@omniheaven/ui";
import { bulkCreateFlatsSchema } from "@omniheaven/validators";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Grid, Layers, Loader2, Sparkles } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";

interface BulkGenerateFlatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string;
  buildingName: string;
  totalFloors?: number | null;
  onSuccess?: () => void;
}

const AVAILABLE_LETTERS = ["A", "B", "C", "D", "E", "F"];

export function BulkGenerateFlatsModal({
  open,
  onOpenChange,
  buildingId,
  buildingName,
  totalFloors = 6,
  onSuccess,
}: BulkGenerateFlatsModalProps) {
  const queryClient = useQueryClient();

  const [floorStart, setFloorStart] = useState<number>(1);
  const [floorEnd, setFloorEnd] = useState<number>(totalFloors || 6);
  const [selectedLetters, setSelectedLetters] = useState<string[]>(["A", "B"]);
  const [unitType, _setUnitType] = useState<"residential" | "commercial" | "studio" | "duplex">(
    "residential",
  );
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [balconies, setBalconies] = useState(2);
  const [squareFeet, setSquareFeet] = useState(1450);
  const [rentAmount, setRentAmount] = useState(30000);
  const [serviceCharge, setServiceCharge] = useState(5000);
  const [meterType, setMeterType] = useState<"prepaid" | "postpaid">("prepaid");
  const [gasType, setGasType] = useState<"cylinder" | "pipeline" | "none">("cylinder");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Toggle unit letters
  const toggleLetter = (letter: string) => {
    if (selectedLetters.includes(letter)) {
      if (selectedLetters.length === 1) return; // Keep at least one
      setSelectedLetters(selectedLetters.filter((l) => l !== letter));
    } else {
      setSelectedLetters([...selectedLetters, letter].sort());
    }
  };

  // Preview generated codes
  const generatedCodes = useMemo(() => {
    const codes: string[] = [];
    if (floorEnd < floorStart) return codes;
    for (let fl = floorStart; fl <= floorEnd; fl++) {
      for (const letter of selectedLetters) {
        codes.push(`${fl}${letter}`);
      }
    }
    return codes;
  }, [floorStart, floorEnd, selectedLetters]);

  const bulkMutation = trpc.property.bulkCreateFlats.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validation = bulkCreateFlatsSchema.safeParse({
      buildingId,
      floorStart: Number(floorStart),
      floorEnd: Number(floorEnd),
      letters: selectedLetters,
      unitType,
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      balconies: Number(balconies),
      squareFeet: squareFeet ? Number(squareFeet) : null,
      defaultRentAmount: Number(rentAmount),
      defaultServiceCharge: Number(serviceCharge),
      electricityMeterType: meterType,
      gasType,
    });

    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || "Invalid flat generator inputs");
      return;
    }

    try {
      await bulkMutation.mutateAsync(validation.data);
      await queryClient.invalidateQueries();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to bulk generate flats.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="size-4" />
            </span>
            <DialogTitle className="text-xl sm:text-2xl font-display font-bold text-foreground">
              Bulk Generate Flats Wizard
            </DialogTitle>
          </div>
          <DialogDescription className="text-foreground-muted text-xs sm:text-sm">
            Generate multiple floor units in a single transaction for{" "}
            <strong className="text-foreground">{buildingName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Floor Range Selection */}
          <div className="grid grid-cols-2 gap-4 p-3.5 rounded-2xl bg-surface border border-border">
            <div className="space-y-1.5">
              <Label htmlFor="floor-start" className="text-xs font-semibold text-foreground">
                Start Floor
              </Label>
              <Input
                id="floor-start"
                type="number"
                min={0}
                max={100}
                value={floorStart}
                onChange={(e) => setFloorStart(Number(e.target.value))}
                className="h-10 text-xs bg-background border-border"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="floor-end" className="text-xs font-semibold text-foreground">
                End Floor
              </Label>
              <Input
                id="floor-end"
                type="number"
                min={0}
                max={100}
                value={floorEnd}
                onChange={(e) => setFloorEnd(Number(e.target.value))}
                className="h-10 text-xs bg-background border-border"
                required
              />
            </div>
          </div>

          {/* Unit Letters Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Units Per Floor (Suffixes)
              </Label>
              <span className="text-[11px] text-foreground-muted">
                {selectedLetters.length} units per floor selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_LETTERS.map((letter) => {
                const isSelected = selectedLetters.includes(letter);
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => toggleLetter(letter)}
                    className={`size-11 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/40"
                        : "bg-surface border border-border text-foreground-muted hover:text-foreground hover:bg-surface-elevated"
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Flat Code Preview Pill Matrix */}
          <div className="p-3.5 rounded-2xl bg-surface/80 border border-border space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-foreground">
                <Sparkles className="size-3.5 text-primary" /> Generated Flat Preview
              </span>
              <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30">
                {generatedCodes.length} Units Total
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {generatedCodes.map((code) => (
                <span
                  key={code}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-card border border-border text-foreground tabular-nums shadow-2xs"
                >
                  {code}
                </span>
              ))}
            </div>
          </div>

          {/* Default Specifications (BHK, Rent, Meters) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gen-bed" className="text-xs font-semibold text-foreground">
                Bedrooms
              </Label>
              <Input
                id="gen-bed"
                type="number"
                min={0}
                value={bedrooms}
                onChange={(e) => setBedrooms(Number(e.target.value))}
                className="h-10 text-xs bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gen-bath" className="text-xs font-semibold text-foreground">
                Bathrooms
              </Label>
              <Input
                id="gen-bath"
                type="number"
                min={0}
                value={bathrooms}
                onChange={(e) => setBathrooms(Number(e.target.value))}
                className="h-10 text-xs bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gen-balcony" className="text-xs font-semibold text-foreground">
                Balconies
              </Label>
              <Input
                id="gen-balcony"
                type="number"
                min={0}
                value={balconies}
                onChange={(e) => setBalconies(Number(e.target.value))}
                className="h-10 text-xs bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gen-sqft" className="text-xs font-semibold text-foreground">
                Sq. Feet
              </Label>
              <Input
                id="gen-sqft"
                type="number"
                min={0}
                value={squareFeet}
                onChange={(e) => setSquareFeet(Number(e.target.value))}
                className="h-10 text-xs bg-background border-border"
              />
            </div>
          </div>

          {/* Rent and Service Charge in BDT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gen-rent" className="text-xs font-semibold text-foreground">
                Default Rent (BDT / ৳)
              </Label>
              <Input
                id="gen-rent"
                type="number"
                min={0}
                value={rentAmount}
                onChange={(e) => setRentAmount(Number(e.target.value))}
                className="h-10 text-xs bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gen-sc" className="text-xs font-semibold text-foreground">
                Service Charge (BDT / ৳)
              </Label>
              <Input
                id="gen-sc"
                type="number"
                min={0}
                value={serviceCharge}
                onChange={(e) => setServiceCharge(Number(e.target.value))}
                className="h-10 text-xs bg-background border-border"
              />
            </div>
          </div>

          {/* Meters & Utilities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="meter-type" className="text-xs font-semibold text-foreground">
                Electricity Meter Type
              </Label>
              <select
                id="meter-type"
                value={meterType}
                onChange={(e) => setMeterType(e.target.value as any)}
                aria-label="Electricity Meter Type"
                className="w-full h-10 px-3 bg-background border border-border text-xs rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="prepaid">Prepaid Smart Meter</option>
                <option value="postpaid">Postpaid Analog Meter</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gas-type" className="text-xs font-semibold text-foreground">
                Gas Connection Type
              </Label>
              <select
                id="gas-type"
                value={gasType}
                onChange={(e) => setGasType(e.target.value as any)}
                aria-label="Gas Connection Type"
                className="w-full h-10 px-3 bg-background border border-border text-xs rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="cylinder">LPG Gas Cylinder</option>
                <option value="pipeline">Titas / Karnaphuli Pipeline</option>
                <option value="none">Electric Only / None</option>
              </select>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 min-h-[48px] px-5 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="luxury"
              disabled={bulkMutation.isPending || generatedCodes.length === 0}
              className="h-11 min-h-[48px] px-6 text-xs font-bold"
            >
              {bulkMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Provisioning...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Grid className="size-4" /> Generate {generatedCodes.length} Flats
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
