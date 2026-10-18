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
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  History,
  Home,
  Info,
  Loader2,
  Lock,
  Save,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc";
import { EntityAuditTimeline } from "./entity-audit-timeline";

export interface FlatRecord {
  id: string;
  buildingId: string;
  flatNumber: string;
  floor: number;
  unitType: string;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  squareFeet?: number | null;
  defaultRentAmount: number;
  defaultServiceCharge: number;
  electricityMeterNumber?: string | null;
  electricityMeterType: string;
  gasType: string;
  waterSubmeterNumber?: string | null;
  notes?: string | null;
  status: "vacant" | "occupied" | "under_maintenance";
}

interface FlatDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flat: FlatRecord | null;
  buildingName?: string;
}

export function FlatDetailModal({ open, onOpenChange, flat, buildingName }: FlatDetailModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"specs" | "meters" | "renters" | "audit">("specs");

  // Form states
  const [flatNumber, setFlatNumber] = useState("");
  const [unitType, setUnitType] = useState<any>("residential");
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [balconies, setBalconies] = useState(1);
  const [squareFeet, setSquareFeet] = useState<number | "">("");
  const [rentAmount, setRentAmount] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [notes, setNotes] = useState("");

  // Meters
  const [elecMeterNumber, setElecMeterNumber] = useState("");
  const [elecMeterType, setElecMeterType] = useState<any>("prepaid");
  const [gasType, setGasType] = useState<any>("cylinder");
  const [waterSubmeter, setWaterSubmeter] = useState("");

  // Status
  const [status, setStatus] = useState<"vacant" | "occupied" | "under_maintenance">("vacant");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync form when flat changes
  useEffect(() => {
    if (flat) {
      setFlatNumber(flat.flatNumber);
      setUnitType(flat.unitType || "residential");
      setBedrooms(flat.bedrooms || 3);
      setBathrooms(flat.bathrooms || 2);
      setBalconies(flat.balconies || 1);
      setSquareFeet(flat.squareFeet ?? "");
      setRentAmount(flat.defaultRentAmount || 0);
      setServiceCharge(flat.defaultServiceCharge || 0);
      setNotes(flat.notes || "");
      setElecMeterNumber(flat.electricityMeterNumber || "");
      setElecMeterType(flat.electricityMeterType || "prepaid");
      setGasType(flat.gasType || "cylinder");
      setWaterSubmeter(flat.waterSubmeterNumber || "");
      setStatus(flat.status || "vacant");
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [flat]);

  const updateFlatMutation = trpc.property.updateFlat.useMutation();
  const updateStatusMutation = trpc.property.updateFlatStatus.useMutation();

  if (!flat) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await updateFlatMutation.mutateAsync({
        id: flat.id,
        flatNumber,
        unitType,
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        balconies: Number(balconies),
        squareFeet: squareFeet ? Number(squareFeet) : null,
        defaultRentAmount: Number(rentAmount),
        defaultServiceCharge: Number(serviceCharge),
        electricityMeterNumber: elecMeterNumber.trim() ? elecMeterNumber.trim() : null,
        electricityMeterType: elecMeterType,
        gasType,
        waterSubmeterNumber: waterSubmeter.trim() ? waterSubmeter.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
        status,
      });

      setSuccessMsg("Flat specifications updated successfully.");
      await queryClient.invalidateQueries();
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update flat");
    }
  };

  const handleStatusSwitch = async (newStatus: "vacant" | "under_maintenance") => {
    setErrorMsg(null);
    try {
      await updateStatusMutation.mutateAsync({
        flatId: flat.id,
        status: newStatus,
      });
      setStatus(newStatus);
      setSuccessMsg(`Flat status updated to ${newStatus}`);
      await queryClient.invalidateQueries();
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Cannot change status of occupied unit");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border-gold/30 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-9 rounded-xl bg-primary/10 text-primary border border-border-gold/30 flex items-center justify-center font-bold text-sm">
                {flat.flatNumber}
              </span>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-serif font-bold text-foreground">
                  Unit {flat.flatNumber} Specifications
                </DialogTitle>
                <DialogDescription className="text-foreground-muted text-xs">
                  Floor {flat.floor} · {buildingName || "Residential Property"}
                </DialogDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className={`text-[11px] font-bold px-2.5 py-1 uppercase tracking-wider ${
                status === "occupied"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  : status === "vacant"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-surface-elevated text-foreground-muted border-border"
              }`}
            >
              ● {status.replace("_", " ")}
            </Badge>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 border-b border-border pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("specs")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 ${
              activeTab === "specs"
                ? "bg-primary/10 text-primary border border-primary/20 shadow-2xs"
                : "text-foreground-muted hover:text-foreground hover:bg-surface"
            }`}
          >
            <Home className="size-3.5" />
            General Specs
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("meters")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 ${
              activeTab === "meters"
                ? "bg-primary/10 text-primary border border-primary/20 shadow-2xs"
                : "text-foreground-muted hover:text-foreground hover:bg-surface"
            }`}
          >
            <Zap className="size-3.5" />
            Utility Meters
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("renters")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 ${
              activeTab === "renters"
                ? "bg-primary/10 text-primary border border-primary/20 shadow-2xs"
                : "text-foreground-muted hover:text-foreground hover:bg-surface"
            }`}
          >
            <Users className="size-3.5" />
            Renter & Lease Status
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 ${
              activeTab === "audit"
                ? "bg-primary/10 text-primary border border-primary/20 shadow-2xs"
                : "text-foreground-muted hover:text-foreground hover:bg-surface"
            }`}
          >
            <History className="size-3.5" />
            Audit History
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Tab 1: General Specs */}
          {activeTab === "specs" && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="flat-no" className="text-xs font-semibold text-foreground">
                    Flat Code / Number
                  </Label>
                  <Input
                    id="flat-no"
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                    className="h-10 text-xs bg-background border-border"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="unit-type" className="text-xs font-semibold text-foreground">
                    Unit Type
                  </Label>
                  <select
                    id="unit-type"
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    aria-label="Unit Type"
                    className="w-full h-10 px-3 bg-background border border-border text-xs rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="residential">Residential Apartment</option>
                    <option value="commercial">Commercial Office</option>
                    <option value="studio">Studio Suite</option>
                    <option value="duplex">Duplex</option>
                  </select>
                </div>
              </div>

              {/* BHK Room Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="flat-bed" className="text-xs font-semibold text-foreground">
                    Bedrooms
                  </Label>
                  <Input
                    id="flat-bed"
                    type="number"
                    min={0}
                    value={bedrooms}
                    onChange={(e) => setBedrooms(Number(e.target.value))}
                    className="h-10 text-xs bg-background border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="flat-bath" className="text-xs font-semibold text-foreground">
                    Bathrooms
                  </Label>
                  <Input
                    id="flat-bath"
                    type="number"
                    min={0}
                    value={bathrooms}
                    onChange={(e) => setBathrooms(Number(e.target.value))}
                    className="h-10 text-xs bg-background border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="flat-balcony" className="text-xs font-semibold text-foreground">
                    Balconies
                  </Label>
                  <Input
                    id="flat-balcony"
                    type="number"
                    min={0}
                    value={balconies}
                    onChange={(e) => setBalconies(Number(e.target.value))}
                    className="h-10 text-xs bg-background border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="flat-sqft" className="text-xs font-semibold text-foreground">
                    Square Feet
                  </Label>
                  <Input
                    id="flat-sqft"
                    type="number"
                    min={0}
                    value={squareFeet}
                    onChange={(e) =>
                      setSquareFeet(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="h-10 text-xs bg-background border-border"
                  />
                </div>
              </div>

              {/* Rent & Service Charge in BDT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="flat-rent" className="text-xs font-semibold text-foreground">
                    Monthly Rent (BDT / ৳)
                  </Label>
                  <Input
                    id="flat-rent"
                    type="number"
                    min={0}
                    value={rentAmount}
                    onChange={(e) => setRentAmount(Number(e.target.value))}
                    className="h-10 text-xs bg-background border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="flat-sc" className="text-xs font-semibold text-foreground">
                    Service Charge (BDT / ৳)
                  </Label>
                  <Input
                    id="flat-sc"
                    type="number"
                    min={0}
                    value={serviceCharge}
                    onChange={(e) => setServiceCharge(Number(e.target.value))}
                    className="h-10 text-xs bg-background border-border"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="flat-notes" className="text-xs font-semibold text-foreground">
                  Notes & Unit Features
                </Label>
                <Input
                  id="flat-notes"
                  placeholder="e.g. South-facing master bedroom, renovated kitchen, parquet flooring"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-10 text-xs bg-background border-border"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Utility Meters */}
          {activeTab === "meters" && (
            <div className="space-y-4 pt-1">
              <div className="p-3 rounded-xl bg-surface border border-border text-xs text-foreground-muted flex items-start gap-2">
                <Info className="size-4 text-primary shrink-0 mt-0.5" />
                <span>
                  Utility meter numbers enable automated submeter reading and billing calculations
                  in Domain 04.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="elec-meter-no" className="text-xs font-semibold text-foreground">
                    Electricity Meter Number
                  </Label>
                  <Input
                    id="elec-meter-no"
                    placeholder="DPDC-123456 or DESCO-987654"
                    value={elecMeterNumber}
                    onChange={(e) => setElecMeterNumber(e.target.value)}
                    className="h-10 text-xs bg-background border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="elec-type" className="text-xs font-semibold text-foreground">
                    Electricity Meter Type
                  </Label>
                  <select
                    id="elec-type"
                    value={elecMeterType}
                    onChange={(e) => setElecMeterType(e.target.value)}
                    aria-label="Electricity Meter Type"
                    className="w-full h-10 px-3 bg-background border border-border text-xs rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="prepaid">Prepaid Smart Card Meter</option>
                    <option value="postpaid">Postpaid Analog Meter</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gas-type-sel" className="text-xs font-semibold text-foreground">
                    Gas Connection
                  </Label>
                  <select
                    id="gas-type-sel"
                    value={gasType}
                    onChange={(e) => setGasType(e.target.value)}
                    aria-label="Gas Connection"
                    className="w-full h-10 px-3 bg-background border border-border text-xs rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="cylinder">LPG Cylinder Supply</option>
                    <option value="pipeline">Government Pipeline (Titas/KGDCL)</option>
                    <option value="none">Electric Induction / None</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="water-submeter" className="text-xs font-semibold text-foreground">
                    Water Submeter Number
                  </Label>
                  <Input
                    id="water-submeter"
                    placeholder="WASA-SUB-4A"
                    value={waterSubmeter}
                    onChange={(e) => setWaterSubmeter(e.target.value)}
                    className="h-10 text-xs bg-background border-border"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Historical Renters & Status Controls */}
          {activeTab === "renters" && (
            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground">Current Occupancy</p>
                    <p className="text-[11px] text-foreground-muted">
                      {status === "occupied"
                        ? "Currently leased by an active renter"
                        : status === "vacant"
                          ? "Ready to lease to a new renter"
                          : "Temporarily locked for maintenance & paint"}
                    </p>
                  </div>

                  {status === "occupied" && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30">
                      <Lock className="size-3.5" /> Leased Unit
                    </span>
                  )}
                </div>

                {status !== "occupied" ? (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                    <Button
                      type="button"
                      variant={status === "vacant" ? "luxury" : "outline"}
                      size="sm"
                      onClick={() => handleStatusSwitch("vacant")}
                      className="text-xs h-9"
                    >
                      Mark as Available (Vacant)
                    </Button>
                    <Button
                      type="button"
                      variant={status === "under_maintenance" ? "luxury" : "outline"}
                      size="sm"
                      onClick={() => handleStatusSwitch("under_maintenance")}
                      className="text-xs h-9"
                    >
                      <Wrench className="size-3.5 mr-1" />
                      Mark Under Maintenance
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-card border border-border/80 text-xs text-foreground-muted space-y-1">
                    <p className="font-semibold text-foreground">Active Rental Contract</p>
                    <p className="text-[11px]">
                      To vacate this unit, proceed to the <strong>Renters & Leases</strong> domain
                      to conclude the contract and settle security deposit balances.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Audit History */}
          {activeTab === "audit" && flat && (
            <div className="pt-2">
              <EntityAuditTimeline entityType="flat" entityId={flat.id} />
            </div>
          )}

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 min-h-[48px] px-5 text-xs"
            >
              Close
            </Button>
            <Button
              type="submit"
              variant="luxury"
              disabled={updateFlatMutation.isPending}
              className="h-11 min-h-[48px] px-6 text-xs font-bold"
            >
              {updateFlatMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Saving...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Save className="size-4" /> Save Specifications
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
