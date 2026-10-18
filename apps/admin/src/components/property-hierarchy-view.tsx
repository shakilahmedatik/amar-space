"use client";

import { Badge, Button, Card } from "@omniheaven/ui";
import { ArrowLeft, Building2, ChevronRight, Clock, Grid, MapPin, Plus, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { useOrganization } from "../lib/organization-context";
import { trpc } from "../lib/trpc";
import { AddBuildingModal } from "./add-building-modal";
import { BulkGenerateFlatsModal } from "./bulk-generate-flats-modal";
import { EmergencyContactsWidget } from "./emergency-contacts-widget";
import { FlatDetailModal, type FlatRecord } from "./flat-detail-modal";

// Fallback demo building fixture if server has no live DB records
const DEMO_BUILDINGS = [
  {
    id: "bld-dhanmondi-lakeview",
    name: "Dhanmondi Lakeview Residency",
    address: "House 42, Road 8/A, Dhanmondi",
    city: "Dhaka",
    thana: "Dhanmondi",
    postalCode: "1205",
    totalFloors: 6,
    hasElevator: true,
    hasGenerator: true,
    gateClosingTime: "11:00 PM",
    caretakerPhone: "01712345678",
    managerPhone: "01812345678",
    stats: {
      totalFlats: 12,
      occupiedFlats: 6,
      vacantFlats: 5,
      underMaintenanceFlats: 1,
      occupancyRate: 50,
      totalRentalValue: 366000,
    },
    flats: [] as any[],
    emergencyContacts: [
      {
        id: "emg-caretaker-dhanmondi",
        name: "Abdur Rahim (Caretaker)",
        role: "Head Caretaker & Gate Security",
        phone: "01712345678",
        type: "building",
      },
      {
        id: "emg-police-dhanmondi",
        name: "Dhanmondi Police Station",
        role: "Local Police Thana",
        phone: "01713373126",
        type: "nearby",
      },
    ],
  },
];

// Fallback demo flats fixture for Dhanmondi Lakeview
const DEMO_FLATS: FlatRecord[] = [
  {
    id: "f-1a",
    buildingId: "bld-dhanmondi-lakeview",
    flatNumber: "1A",
    floor: 1,
    unitType: "residential",
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    squareFeet: 1450,
    defaultRentAmount: 28000,
    defaultServiceCharge: 5000,
    electricityMeterType: "prepaid",
    gasType: "cylinder",
    status: "occupied",
  },
  {
    id: "f-1b",
    buildingId: "bld-dhanmondi-lakeview",
    flatNumber: "1B",
    floor: 1,
    unitType: "residential",
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    squareFeet: 1450,
    defaultRentAmount: 28000,
    defaultServiceCharge: 5000,
    electricityMeterType: "prepaid",
    gasType: "cylinder",
    status: "occupied",
  },
  {
    id: "f-2a",
    buildingId: "bld-dhanmondi-lakeview",
    flatNumber: "2A",
    floor: 2,
    unitType: "residential",
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    squareFeet: 1450,
    defaultRentAmount: 29000,
    defaultServiceCharge: 5000,
    electricityMeterType: "prepaid",
    gasType: "cylinder",
    status: "occupied",
  },
  {
    id: "f-2b",
    buildingId: "bld-dhanmondi-lakeview",
    flatNumber: "2B",
    floor: 2,
    unitType: "residential",
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    squareFeet: 1450,
    defaultRentAmount: 29000,
    defaultServiceCharge: 5000,
    electricityMeterType: "prepaid",
    gasType: "cylinder",
    status: "occupied",
  },
  {
    id: "f-3a",
    buildingId: "bld-dhanmondi-lakeview",
    flatNumber: "3A",
    floor: 3,
    unitType: "residential",
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    squareFeet: 1450,
    defaultRentAmount: 30000,
    defaultServiceCharge: 5000,
    electricityMeterType: "prepaid",
    gasType: "cylinder",
    status: "occupied",
  },
  {
    id: "f-3b",
    buildingId: "bld-dhanmondi-lakeview",
    flatNumber: "3B",
    floor: 3,
    unitType: "residential",
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    squareFeet: 1450,
    defaultRentAmount: 30000,
    defaultServiceCharge: 5000,
    electricityMeterType: "prepaid",
    gasType: "cylinder",
    status: "occupied",
  },
  {
    id: "f-4a",
    buildingId: "bld-dhanmondi-lakeview",
    flatNumber: "4A",
    floor: 4,
    unitType: "residential",
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    squareFeet: 1450,
    defaultRentAmount: 31000,
    defaultServiceCharge: 5000,
    electricityMeterType: "prepaid",
    gasType: "cylinder",
    status: "vacant",
  },
  {
    id: "f-4b",
    buildingId: "bld-dhanmondi-lakeview",
    flatNumber: "4B",
    floor: 4,
    unitType: "residential",
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    squareFeet: 1450,
    defaultRentAmount: 31000,
    defaultServiceCharge: 5000,
    electricityMeterType: "prepaid",
    gasType: "cylinder",
    status: "vacant",
  },
  {
    id: "f-5a",
    buildingId: "bld-dhanmondi-lakeview",
    flatNumber: "5A",
    floor: 5,
    unitType: "residential",
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    squareFeet: 1450,
    defaultRentAmount: 32000,
    defaultServiceCharge: 5000,
    electricityMeterType: "prepaid",
    gasType: "cylinder",
    status: "vacant",
  },
  {
    id: "f-5b",
    buildingId: "bld-dhanmondi-lakeview",
    flatNumber: "5B",
    floor: 5,
    unitType: "residential",
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    squareFeet: 1450,
    defaultRentAmount: 32000,
    defaultServiceCharge: 5000,
    electricityMeterType: "prepaid",
    gasType: "cylinder",
    status: "vacant",
  },
  {
    id: "f-6a",
    buildingId: "bld-dhanmondi-lakeview",
    flatNumber: "6A",
    floor: 6,
    unitType: "residential",
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    squareFeet: 1450,
    defaultRentAmount: 33000,
    defaultServiceCharge: 5000,
    electricityMeterType: "prepaid",
    gasType: "cylinder",
    status: "vacant",
  },
  {
    id: "f-6b",
    buildingId: "bld-dhanmondi-lakeview",
    flatNumber: "6B",
    floor: 6,
    unitType: "residential",
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    squareFeet: 1450,
    defaultRentAmount: 33000,
    defaultServiceCharge: 5000,
    electricityMeterType: "prepaid",
    gasType: "cylinder",
    status: "under_maintenance",
  },
];

export function PropertyHierarchyView() {
  const { activeOrg } = useOrganization();

  // Selected building for the Floor Matrix view (null = buildings overview)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  // Modals
  const [isAddBuildingOpen, setAddBuildingOpen] = useState(false);
  const [isBulkFlatsOpen, setBulkFlatsOpen] = useState(false);
  const [selectedFlatForDetail, setSelectedFlatForDetail] = useState<FlatRecord | null>(null);

  // Filter state for flats
  const [flatStatusFilter, setFlatStatusFilter] = useState<string>("all");

  // Fetch buildings from tRPC
  const { data: serverBuildings } = trpc.property.listBuildings.useQuery(undefined, {
    retry: false,
  });

  const buildings =
    serverBuildings && serverBuildings.length > 0 ? serverBuildings : DEMO_BUILDINGS;

  // Selected building
  const selectedBuilding = useMemo(() => {
    if (!selectedBuildingId) return null;
    return buildings.find((b) => b.id === selectedBuildingId) || null;
  }, [buildings, selectedBuildingId]);

  // Fetch flats for selected building
  const { data: serverFlats } = trpc.property.listFlatsByBuilding.useQuery(
    { buildingId: selectedBuildingId ?? "" },
    { enabled: !!selectedBuildingId, retry: false },
  );

  const flats: FlatRecord[] = useMemo(() => {
    if (serverFlats && serverFlats.length > 0) {
      return serverFlats as FlatRecord[];
    }
    if (selectedBuildingId === "bld-dhanmondi-lakeview") {
      return DEMO_FLATS;
    }
    return [];
  }, [serverFlats, selectedBuildingId]);

  // Filter flats
  const filteredFlats = useMemo(() => {
    if (flatStatusFilter === "all") return flats;
    return flats.filter((f) => f.status === flatStatusFilter);
  }, [flats, flatStatusFilter]);

  // Group flats by floor (descending order, top floor down)
  const floorsMap = useMemo(() => {
    const map = new Map<number, FlatRecord[]>();
    for (const flat of filteredFlats) {
      const list = map.get(flat.floor) || [];
      list.push(flat);
      map.set(flat.floor, list);
    }
    // Sort descending by floor number
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filteredFlats]);

  // Overview metrics calculation
  const totalBuildingsCount = buildings.length;
  const totalUnitsCount = buildings.reduce((sum, b) => sum + (b.stats?.totalFlats || 0), 0);
  const totalOccupiedCount = buildings.reduce((sum, b) => sum + (b.stats?.occupiedFlats || 0), 0);
  const overallOccupancyRate =
    totalUnitsCount > 0 ? Math.round((totalOccupiedCount / totalUnitsCount) * 100) : 0;
  const totalMonthlyRentalValue = buildings.reduce(
    (sum, b) => sum + (b.stats?.totalRentalValue || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* View 1: Building Overview Grid */}
      {!selectedBuilding ? (
        <>
          {/* Header banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
                Buildings & Unit Hierarchy
              </h1>
              <p className="text-xs sm:text-sm text-foreground-muted mt-1">
                Manage physical towers, floor plans, and unit occupancy status for{" "}
                <strong className="text-foreground">{activeOrg.name}</strong>.
              </p>
            </div>

            <Button
              variant="luxury"
              onClick={() => setAddBuildingOpen(true)}
              className="min-h-[48px] px-5 flex items-center gap-2 text-xs font-bold shrink-0 self-start sm:self-auto shadow-sm"
            >
              <Plus className="size-4" />
              Add New Building
            </Button>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card variant="default" className="p-4 shadow-2xs">
              <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                Total Properties
              </p>
              <p className="text-2xl font-bold font-display text-foreground mt-1 tabular-nums">
                {totalBuildingsCount}
              </p>
            </Card>
            <Card variant="goldAccent" className="p-4 shadow-2xs">
              <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                Total Flats / Units
              </p>
              <p className="text-2xl font-bold font-display text-primary mt-1 tabular-nums">
                {totalUnitsCount}
              </p>
            </Card>
            <Card variant="default" className="p-4 shadow-2xs">
              <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                Occupancy Rate
              </p>
              <p className="text-2xl font-bold font-display text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                {overallOccupancyRate}%
              </p>
            </Card>
            <Card variant="default" className="p-4 shadow-2xs">
              <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                Est. Monthly Value
              </p>
              <p className="text-2xl font-bold font-display text-foreground mt-1 tabular-nums">
                ৳{totalMonthlyRentalValue.toLocaleString()}
              </p>
            </Card>
          </div>

          {/* Buildings Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground-muted">
                Property Portfolio ({buildings.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {buildings.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  onClick={() => setSelectedBuildingId(b.id)}
                  className="w-full text-left p-5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all shadow-2xs hover:shadow-md cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Row: Building Name & Occupancy Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <Building2 className="size-5" />
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                            {b.name}
                          </h3>
                          <p className="text-[11px] text-foreground-muted flex items-center gap-1 mt-0.5">
                            <MapPin className="size-3 text-primary" />
                            {b.thana ? `${b.thana}, ${b.city}` : b.address}
                          </p>
                        </div>
                      </div>

                      <Badge variant="success" className="text-[10px] font-bold px-2 py-0.5">
                        {b.stats?.occupancyRate || 0}% Leased
                      </Badge>
                    </div>

                    {/* Amenities pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {b.hasElevator && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface text-foreground-muted border border-border flex items-center gap-1">
                          <Building2 className="size-3 text-primary" /> Lift Active
                        </span>
                      )}
                      {b.hasGenerator && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface text-foreground-muted border border-border flex items-center gap-1">
                          <Zap className="size-3 text-primary" /> Generator
                        </span>
                      )}
                      {b.gateClosingTime && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface text-foreground-muted border border-border flex items-center gap-1">
                          <Clock className="size-3 text-primary" /> Gate: {b.gateClosingTime}
                        </span>
                      )}
                    </div>

                    {/* Stats summary */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-surface/70 border border-border text-center">
                      <div>
                        <p className="text-[10px] text-foreground-muted">Units</p>
                        <p className="text-xs font-bold text-foreground tabular-nums">
                          {b.stats?.totalFlats || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-foreground-muted">Occupied</p>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                          {b.stats?.occupiedFlats || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-foreground-muted">Available</p>
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {b.stats?.vacantFlats || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card footer CTA */}
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                    <span>Explore Floor & Unit Matrix</span>
                    <ChevronRight className="size-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* View 2: Floor & Unit Matrix View */
        <div className="space-y-6">
          {/* Breadcrumb & Navigation Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setSelectedBuildingId(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline mb-1"
              >
                <ArrowLeft className="size-3.5" /> Back to Properties Portfolio
              </button>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                {selectedBuilding.name} — Floor Matrix
              </h1>
              <p className="text-xs text-foreground-muted flex items-center gap-1.5">
                <MapPin className="size-3 text-primary" />
                {selectedBuilding.address}, {selectedBuilding.thana}, {selectedBuilding.city} ·{" "}
                {selectedBuilding.totalFloors || 6} Floors
              </p>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkFlatsOpen(true)}
                className="text-xs h-10 min-h-[44px] flex items-center gap-1.5"
              >
                <Grid className="size-3.5 text-primary" />
                Bulk Generate Units
              </Button>
            </div>
          </div>

          {/* Emergency & Caretaker Contacts Directory Widget */}
          <EmergencyContactsWidget
            buildingId={selectedBuilding.id}
            buildingName={selectedBuilding.name}
            initialContacts={selectedBuilding.emergencyContacts}
          />

          {/* Floor & Unit Matrix Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground-muted">
                  Floor-by-Floor Unit Matrix
                </h2>
                <Badge
                  variant="outline"
                  className="text-xs font-bold text-primary border-primary/20"
                >
                  {flats.length} Total Units
                </Badge>
              </div>

              {/* Status Filter Pill Tabs */}
              <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border">
                {["all", "vacant", "occupied", "under_maintenance"].map((statusKey) => (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => setFlatStatusFilter(statusKey)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                      flatStatusFilter === statusKey
                        ? "bg-card text-foreground shadow-2xs border border-border font-bold"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    {statusKey.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix Floors Layout (Top floor down) */}
            <div className="space-y-4">
              {floorsMap.map(([floorNum, floorFlats]) => (
                <div
                  key={floorNum}
                  className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-2xs"
                >
                  {/* Floor Header */}
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="size-6 rounded-md bg-surface-elevated text-primary border border-border font-bold text-xs flex items-center justify-center tabular-nums">
                        {floorNum}
                      </span>
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                        Floor {floorNum}
                      </h3>
                      <span className="text-[11px] text-foreground-muted">
                        ({floorFlats.length} units)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                        ● {floorFlats.filter((f) => f.status === "vacant").length} Available
                      </span>
                      <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                        ● {floorFlats.filter((f) => f.status === "occupied").length} Occupied
                      </span>
                    </div>
                  </div>

                  {/* Floor Units Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {floorFlats.map((flat) => (
                      <button
                        type="button"
                        key={flat.id}
                        onClick={() => setSelectedFlatForDetail(flat)}
                        className={`w-full p-3.5 rounded-xl border text-left cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] min-h-[52px] group ${
                          flat.status === "vacant"
                            ? "bg-card border-border hover:border-emerald-500/50"
                            : flat.status === "occupied"
                              ? "bg-card border-border hover:border-amber-500/50"
                              : "bg-surface border-border hover:border-border/80"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="size-8 rounded-lg bg-card border border-border font-bold text-xs flex items-center justify-center text-foreground tabular-nums group-hover:border-primary/50 transition-colors">
                              {flat.flatNumber}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-foreground leading-tight">
                                Flat {flat.flatNumber}
                              </p>
                              <p className="text-[10px] text-foreground-muted capitalize">
                                {flat.bedrooms}B {flat.bathrooms}B · {flat.squareFeet || 1450} sqft
                              </p>
                            </div>
                          </div>

                          <span
                            className={`size-2.5 rounded-full mt-1 shrink-0 ${
                              flat.status === "vacant"
                                ? "bg-emerald-500 ring-2 ring-emerald-500/30 animate-pulse"
                                : flat.status === "occupied"
                                  ? "bg-amber-500"
                                  : "bg-muted-foreground"
                            }`}
                          />
                        </div>

                        {/* Flat Rent in BDT */}
                        <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                          <span className="text-[10px] text-foreground-muted">Rent:</span>
                          <span className="font-bold text-foreground tabular-nums">
                            ৳{flat.defaultRentAmount.toLocaleString()}/mo
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {floorsMap.length === 0 && (
                <div className="p-12 text-center rounded-2xl bg-card border border-border space-y-3">
                  <Grid className="size-10 text-foreground-muted mx-auto" />
                  <p className="text-sm font-bold text-foreground">No units found</p>
                  <p className="text-xs text-foreground-muted max-w-sm mx-auto">
                    There are no flats on this building matching your filter. Use the wizard to bulk
                    generate flats across floors.
                  </p>
                  <Button
                    variant="luxury"
                    size="sm"
                    onClick={() => setBulkFlatsOpen(true)}
                    className="text-xs"
                  >
                    Bulk Generate Flats
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Modals */}
      <AddBuildingModal
        open={isAddBuildingOpen}
        onOpenChange={setAddBuildingOpen}
        onSuccess={(id) => setSelectedBuildingId(id)}
      />

      {selectedBuilding && (
        <BulkGenerateFlatsModal
          open={isBulkFlatsOpen}
          onOpenChange={setBulkFlatsOpen}
          buildingId={selectedBuilding.id}
          buildingName={selectedBuilding.name}
          totalFloors={selectedBuilding.totalFloors}
        />
      )}

      <FlatDetailModal
        open={!!selectedFlatForDetail}
        onOpenChange={(open) => !open && setSelectedFlatForDetail(null)}
        flat={selectedFlatForDetail}
        buildingName={selectedBuilding?.name}
      />
    </div>
  );
}
