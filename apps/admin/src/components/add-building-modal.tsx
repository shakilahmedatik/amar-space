"use client";

import {
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
import { createBuildingSchema } from "@omniheaven/validators";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Building2, Loader2, Plus, Zap } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { trpc } from "../lib/trpc";

const POPULAR_THANAS = [
  "Dhanmondi",
  "Gulshan",
  "Banani",
  "Uttara",
  "Mirpur",
  "Mohammadpur",
  "Bashundhara R/A",
  "Baridhara",
  "Badda",
  "Lalmatia",
  "Tejgaon",
  "Motijheel",
  "Agrabad (Chattogram)",
  "Panchlaish (Chattogram)",
  "Zindabazar (Sylhet)",
];

interface AddBuildingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (buildingId: string) => void;
}

export function AddBuildingModal({ open, onOpenChange, onSuccess }: AddBuildingModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [thana, setThana] = useState("Dhanmondi");
  const [postalCode, setPostalCode] = useState("1205");
  const [totalFloors, setTotalFloors] = useState<number>(6);
  const [hasElevator, setHasElevator] = useState(true);
  const [hasGenerator, setHasGenerator] = useState(true);
  const [gateClosingTime, setGateClosingTime] = useState("11:00 PM");
  const [caretakerPhone, setCaretakerPhone] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [rules, setRules] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = trpc.property.createBuilding.useMutation();

  const handleReset = () => {
    setName("");
    setAddress("");
    setCity("Dhaka");
    setThana("Dhanmondi");
    setPostalCode("1205");
    setTotalFloors(6);
    setHasElevator(true);
    setHasGenerator(true);
    setGateClosingTime("11:00 PM");
    setCaretakerPhone("");
    setManagerPhone("");
    setRules("");
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validation = createBuildingSchema.safeParse({
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      thana: thana ? thana.trim() : null,
      postalCode: postalCode.trim() ? postalCode.trim() : null,
      totalFloors: Number(totalFloors),
      hasElevator,
      hasGenerator,
      gateClosingTime: gateClosingTime.trim() ? gateClosingTime.trim() : null,
      caretakerPhone: caretakerPhone.trim() ? caretakerPhone.trim() : null,
      managerPhone: managerPhone.trim() ? managerPhone.trim() : null,
      rules: rules.trim() ? rules.trim() : null,
    });

    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || "Invalid building specifications");
      return;
    }

    try {
      const created = await createMutation.mutateAsync(validation.data);
      await queryClient.invalidateQueries();
      handleReset();
      onOpenChange(false);
      if (created?.id) {
        onSuccess?.(created.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create building");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="size-4" />
            </span>
            <DialogTitle className="text-xl sm:text-2xl font-display font-bold text-foreground">
              Add New Residential Building
            </DialogTitle>
          </div>
          <DialogDescription className="text-foreground-muted text-xs sm:text-sm">
            Configure physical tower specifications, address, caretakers, and operational amenities.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Building Name */}
          <div className="space-y-1.5">
            <Label htmlFor="building-name" className="text-xs font-semibold text-foreground">
              Building Name / Title <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="building-name"
              placeholder="e.g. Dhanmondi Lakeview Residency or Green View Tower"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 text-sm bg-background border-border"
              required
            />
          </div>

          {/* Location & Address */}
          <div className="space-y-1.5">
            <Label htmlFor="building-address" className="text-xs font-semibold text-foreground">
              Street Address <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="building-address"
              placeholder="e.g. House 42, Road 8/A"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-10 text-xs bg-background border-border"
              required
            />
          </div>

          {/* City, Thana, Postal Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="building-city" className="text-xs font-semibold text-foreground">
                City / District
              </Label>
              <Input
                id="building-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-10 text-xs bg-background border-border"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="building-thana" className="text-xs font-semibold text-foreground">
                Thana / Area
              </Label>
              <select
                id="building-thana"
                value={thana}
                onChange={(e) => setThana(e.target.value)}
                aria-label="Thana Area"
                className="w-full h-10 px-3 bg-background border border-border text-xs rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {POPULAR_THANAS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="building-postal" className="text-xs font-semibold text-foreground">
                Postal Code
              </Label>
              <Input
                id="building-postal"
                placeholder="1205"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="h-10 text-xs bg-background border-border"
              />
            </div>
          </div>

          {/* Floors & Gate Closing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="total-floors" className="text-xs font-semibold text-foreground">
                Total Stories / Floors
              </Label>
              <Input
                id="total-floors"
                type="number"
                min={1}
                max={100}
                value={totalFloors}
                onChange={(e) => setTotalFloors(Number(e.target.value))}
                className="h-10 text-xs bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gate-closing" className="text-xs font-semibold text-foreground">
                Main Gate Closing Time
              </Label>
              <Input
                id="gate-closing"
                placeholder="e.g. 11:00 PM"
                value={gateClosingTime}
                onChange={(e) => setGateClosingTime(e.target.value)}
                className="h-10 text-xs bg-background border-border"
              />
            </div>
          </div>

          {/* Amenities & Infrastructure Toggles */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Building Amenities & Infrastructure
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setHasElevator(!hasElevator)}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all min-h-[48px] ${
                  hasElevator
                    ? "bg-primary/10 border-primary/40 text-foreground"
                    : "bg-surface border-border text-foreground-muted"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`size-7 rounded-lg flex items-center justify-center ${
                      hasElevator
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border"
                    }`}
                  >
                    <Building2 className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold leading-tight">Elevator / Lift</p>
                    <p className="text-[10px] text-foreground-muted">Active 24/7 passenger lift</p>
                  </div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                    hasElevator ? "bg-primary" : "bg-surface-elevated border border-border"
                  }`}
                >
                  <div
                    className={`size-4 rounded-full bg-white transition-transform ${
                      hasElevator ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setHasGenerator(!hasGenerator)}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all min-h-[48px] ${
                  hasGenerator
                    ? "bg-primary/10 border-primary/40 text-foreground"
                    : "bg-surface border-border text-foreground-muted"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`size-7 rounded-lg flex items-center justify-center ${
                      hasGenerator
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border"
                    }`}
                  >
                    <Zap className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold leading-tight">Backup Generator</p>
                    <p className="text-[10px] text-foreground-muted">
                      Lift, water pump & common lights
                    </p>
                  </div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                    hasGenerator ? "bg-primary" : "bg-surface-elevated border border-border"
                  }`}
                >
                  <div
                    className={`size-4 rounded-full bg-white transition-transform ${
                      hasGenerator ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Caretaker & Manager Phones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="caretaker-phone" className="text-xs font-semibold text-foreground">
                Head Caretaker Phone
              </Label>
              <Input
                id="caretaker-phone"
                placeholder="01712345678"
                value={caretakerPhone}
                onChange={(e) => setCaretakerPhone(e.target.value)}
                className="h-10 text-xs bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="manager-phone" className="text-xs font-semibold text-foreground">
                Property Manager Phone
              </Label>
              <Input
                id="manager-phone"
                placeholder="01812345678"
                value={managerPhone}
                onChange={(e) => setManagerPhone(e.target.value)}
                className="h-10 text-xs bg-background border-border"
              />
            </div>
          </div>

          {/* House Rules */}
          <div className="space-y-1.5">
            <Label htmlFor="rules" className="text-xs font-semibold text-foreground">
              Building Rules & General Notices
            </Label>
            <Input
              id="rules"
              placeholder="e.g. Service charge due by 7th of every month. Rooftop access 6 AM - 9 PM."
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              className="h-10 text-xs bg-background border-border"
            />
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
              disabled={createMutation.isPending}
              className="h-11 min-h-[48px] px-6 text-xs font-bold"
            >
              {createMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Provisioning...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Plus className="size-4" /> Save Building
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
