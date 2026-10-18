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
import { type BloodGroup, createRenterSchema } from "@omniheaven/validators";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  ChevronRight,
  FileText,
  HeartPulse,
  IdCard,
  Loader2,
  Phone,
  Shield,
  User,
  Users,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { trpc } from "../lib/trpc";

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface RegisterRenterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (renterId: string) => void;
}

export function RegisterRenterModal({ open, onOpenChange, onSuccess }: RegisterRenterModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Personal & NID
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nidNumber, setNidNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [occupation, setOccupation] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("B+");

  // Step 2: Family & Emergency Contact
  const [totalFamilyMembers, setTotalFamilyMembers] = useState(1);
  const [familyNamesText, setFamilyNamesText] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactNumber, setEmergencyContactNumber] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("Spouse");

  // Step 3: Photos & Digital Signature
  const [nidFrontPhoto, setNidFrontPhoto] = useState(
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
  );
  const [nidBackPhoto, setNidBackPhoto] = useState(
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
  );
  const [digitalSignatureUrl, setDigitalSignatureUrl] = useState(
    "https://omniheaven-storage.s3.amazonaws.com/signatures/demo-sig.png",
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = trpc.renter.createRenter.useMutation();

  const handleReset = () => {
    setStep(1);
    setFullName("");
    setPhone("");
    setNidNumber("");
    setDateOfBirth("");
    setOccupation("");
    setBloodGroup("B+");
    setTotalFamilyMembers(1);
    setFamilyNamesText("");
    setEmergencyContactName("");
    setEmergencyContactNumber("");
    setEmergencyContactRelationship("Spouse");
    setErrorMsg(null);
  };

  const handleStep1Next = () => {
    setErrorMsg(null);
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg("Please provide tenant's full legal name (minimum 2 characters).");
      return;
    }
    const cleanPhone = phone.replace(/[\s\-()]/g, "");
    if (!/^(?:\+8801|01)[3-9]\d{8}$/.test(cleanPhone)) {
      setErrorMsg("Please enter a valid 11-digit Bangladeshi mobile number (017..., 018...).");
      return;
    }
    const cleanNid = nidNumber.replace(/[\s-]/g, "");
    if (!/^(?:\d{10}|\d{17})$/.test(cleanNid)) {
      setErrorMsg("National ID must be either 10 digits (Smart NID) or 17 digits (Legacy NID).");
      return;
    }
    if (!occupation.trim()) {
      setErrorMsg("Please specify tenant's occupation or employer.");
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    setErrorMsg(null);
    if (!emergencyContactName.trim()) {
      setErrorMsg("Emergency contact name is mandatory for tenant safety.");
      return;
    }
    const cleanEmgPhone = emergencyContactNumber.replace(/[\s\-()]/g, "");
    if (!/^(?:\+8801|01)[3-9]\d{8}$/.test(cleanEmgPhone)) {
      setErrorMsg("Emergency contact phone must be a valid Bangladeshi mobile number.");
      return;
    }
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const familyArray = familyNamesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const validation = createRenterSchema.safeParse({
      fullName: fullName.trim(),
      phone: phone.trim(),
      nidNumber: nidNumber.trim(),
      dateOfBirth: dateOfBirth ? dateOfBirth : null,
      occupation: occupation.trim(),
      bloodGroup,
      totalFamilyMembers,
      familyMemberNames: familyArray,
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactNumber: emergencyContactNumber.trim(),
      emergencyContactRelationship: emergencyContactRelationship.trim(),
      nidFrontPhoto: nidFrontPhoto.trim() || null,
      nidBackPhoto: nidBackPhoto.trim() || null,
      digitalSignatureUrl: digitalSignatureUrl.trim() || null,
    });

    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || "Invalid tenant details.");
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
      if (err.message === "NID_ALREADY_EXISTS") {
        setErrorMsg(
          "A tenant with this National ID (NID) is already registered in this organization.",
        );
      } else {
        setErrorMsg(err.message || "Failed to register tenant.");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border-gold/30 shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <IdCard className="size-4" />
            </span>
            <DialogTitle className="text-xl sm:text-2xl font-serif font-bold text-foreground">
              Register New Renter
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-foreground-muted">
            3-Step Tenant Onboarding with mandatory Bangladeshi NID, blood group & emergency
            verification.
          </DialogDescription>

          {/* Step Progress Wizard */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`p-2 rounded-xl text-left border transition-all ${
                step === 1
                  ? "bg-primary/10 border-primary text-primary"
                  : step > 1
                    ? "bg-surface border-border text-foreground"
                    : "bg-surface/50 border-border/50 text-foreground-muted"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="size-4 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center">
                  1
                </span>
                <span>Personal & NID</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (step >= 2) setStep(2);
              }}
              className={`p-2 rounded-xl text-left border transition-all ${
                step === 2
                  ? "bg-primary/10 border-primary text-primary"
                  : step > 2
                    ? "bg-surface border-border text-foreground"
                    : "bg-surface/50 border-border/50 text-foreground-muted"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="size-4 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center">
                  2
                </span>
                <span>Family & Safety</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (step >= 3) setStep(3);
              }}
              className={`p-2 rounded-xl text-left border transition-all ${
                step === 3
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-surface/50 border-border/50 text-foreground-muted"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="size-4 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center">
                  3
                </span>
                <span>KYC & Signature</span>
              </div>
            </button>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Personal & NID */}
        {step === 1 && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="tenant-name" className="text-xs font-semibold text-foreground">
                Tenant Full Legal Name *
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 size-4 text-foreground-muted" />
                <Input
                  id="tenant-name"
                  placeholder="e.g. Farhana Yasmin / Mohammad Ali"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 h-11 text-xs bg-surface border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tenant-phone" className="text-xs font-semibold text-foreground">
                  Mobile Phone Number *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 size-4 text-foreground-muted" />
                  <Input
                    id="tenant-phone"
                    placeholder="01712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 h-11 text-xs bg-surface border-border tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tenant-nid" className="text-xs font-semibold text-foreground">
                  National ID (10 or 17 Digits) *
                </Label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-3.5 size-4 text-foreground-muted" />
                  <Input
                    id="tenant-nid"
                    placeholder="5508123456 or 19922612345678901"
                    value={nidNumber}
                    onChange={(e) => setNidNumber(e.target.value)}
                    className="pl-10 h-11 text-xs bg-surface border-border tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tenant-dob" className="text-xs font-semibold text-foreground">
                  Date of Birth
                </Label>
                <Input
                  id="tenant-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="h-11 text-xs bg-surface border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tenant-occ" className="text-xs font-semibold text-foreground">
                  Occupation / Organization *
                </Label>
                <Input
                  id="tenant-occ"
                  placeholder="e.g. Banker, Grameenphone Engineer"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="h-11 text-xs bg-surface border-border"
                />
              </div>
            </div>

            {/* Blood Group Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <HeartPulse className="size-3.5 text-rose-500" />
                Blood Group (Mandatory for Emergency Medical Safety) *
              </Label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {BLOOD_GROUPS.map((bg) => (
                  <button
                    type="button"
                    key={bg}
                    onClick={() => setBloodGroup(bg)}
                    className={`h-10 rounded-xl text-xs font-bold transition-all border ${
                      bloodGroup === bg
                        ? "bg-rose-500 text-white border-rose-600 shadow-xs"
                        : "bg-surface border-border text-foreground hover:border-border/80"
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="luxury"
                onClick={handleStep1Next}
                className="h-11 text-xs gap-1.5"
              >
                Next: Family & Safety
                <ChevronRight className="size-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 2: Family & Emergency Contact */}
        {step === 2 && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="family-count" className="text-xs font-semibold text-foreground">
                  Total Family / Resident Members *
                </Label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-3.5 size-4 text-foreground-muted" />
                  <Input
                    id="family-count"
                    type="number"
                    min={1}
                    max={30}
                    value={totalFamilyMembers}
                    onChange={(e) => setTotalFamilyMembers(Math.max(1, Number(e.target.value)))}
                    className="pl-10 h-11 text-xs bg-surface border-border tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emg-rel" className="text-xs font-semibold text-foreground">
                  Relationship to Emergency Contact *
                </Label>
                <Input
                  id="emg-rel"
                  placeholder="e.g. Father, Spouse, Brother"
                  value={emergencyContactRelationship}
                  onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                  className="h-11 text-xs bg-surface border-border"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="family-names" className="text-xs font-semibold text-foreground">
                Family Member Names (One per line)
              </Label>
              <textarea
                id="family-names"
                rows={3}
                placeholder={"Saiful Islam (Spouse)\nAayan Islam (Child)"}
                value={familyNamesText}
                onChange={(e) => setFamilyNamesText(e.target.value)}
                className="w-full p-3 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="emg-name" className="text-xs font-semibold text-foreground">
                  Emergency Contact Full Name *
                </Label>
                <Input
                  id="emg-name"
                  placeholder="e.g. Dr. M. A. Rashid"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="h-11 text-xs bg-surface border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emg-phone" className="text-xs font-semibold text-foreground">
                  Emergency Contact Phone *
                </Label>
                <Input
                  id="emg-phone"
                  placeholder="01819876543"
                  value={emergencyContactNumber}
                  onChange={(e) => setEmergencyContactNumber(e.target.value)}
                  className="h-11 text-xs bg-surface border-border tabular-nums"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="h-11 text-xs"
              >
                Back to Step 1
              </Button>
              <Button
                type="button"
                variant="luxury"
                onClick={handleStep2Next}
                className="h-11 text-xs gap-1.5"
              >
                Next: KYC & Signature
                <ChevronRight className="size-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 3: KYC & Signature Verification */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <FileText className="size-4 text-primary" />
                <span>Bangladeshi KYC Document Verification (S3/R2 Storage)</span>
              </div>
              <p className="text-[11px] text-foreground-muted">
                Pre-configured verified image links for tenant NID card front/back and digital
                signature.
              </p>

              <div className="space-y-2">
                <div>
                  <Label className="text-[11px] font-semibold text-foreground">
                    NID Card Front Photo URL
                  </Label>
                  <Input
                    value={nidFrontPhoto}
                    onChange={(e) => setNidFrontPhoto(e.target.value)}
                    className="h-9 text-xs bg-card border-border mt-1 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-foreground">
                    NID Card Back Photo URL
                  </Label>
                  <Input
                    value={nidBackPhoto}
                    onChange={(e) => setNidBackPhoto(e.target.value)}
                    className="h-9 text-xs bg-card border-border mt-1 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-foreground">
                    Digital Signature / Biometric URL
                  </Label>
                  <Input
                    value={digitalSignatureUrl}
                    onChange={(e) => setDigitalSignatureUrl(e.target.value)}
                    className="h-9 text-xs bg-card border-border mt-1 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Summary Review Pill */}
            <div className="p-3.5 rounded-xl bg-card border border-border text-xs space-y-1">
              <p className="font-bold text-foreground">Ready to Register:</p>
              <p className="text-foreground-muted">
                {fullName} · {phone} · NID: {nidNumber} · Blood:{" "}
                <Badge variant="outline" className="text-rose-500 font-bold ml-1">
                  {bloodGroup}
                </Badge>
              </p>
            </div>

            <DialogFooter className="pt-4 border-t border-border flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                disabled={createMutation.isPending}
                className="h-11 text-xs"
              >
                Back to Step 2
              </Button>
              <Button
                type="submit"
                variant="luxury"
                disabled={createMutation.isPending}
                className="h-11 text-xs gap-2 min-h-[44px]"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Registering Tenant...
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Complete Registration
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
