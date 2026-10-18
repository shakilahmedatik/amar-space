"use client";

import {
  Badge,
  Button,
  Card,
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
import { AlertCircle, Loader2, Phone, PhoneCall, Plus, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { trpc } from "../lib/trpc";

export interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone?: string | null;
  type: string; // 'building' | 'nearby'
}

interface EmergencyContactsWidgetProps {
  buildingId: string;
  buildingName: string;
  initialContacts?: EmergencyContact[];
}

export function EmergencyContactsWidget({
  buildingId,
  buildingName,
  initialContacts = [],
}: EmergencyContactsWidgetProps) {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<"building" | "nearby">("building");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: serverContacts } = trpc.property.listEmergencyContacts.useQuery(
    { buildingId },
    { enabled: !!buildingId },
  );

  const contacts = serverContacts || initialContacts;

  const createContactMutation = trpc.property.createEmergencyContact.useMutation();
  const deleteContactMutation = trpc.property.deleteEmergencyContact.useMutation();

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !role.trim()) {
      setErrorMsg("Name and role are required");
      return;
    }

    try {
      await createContactMutation.mutateAsync({
        buildingId,
        name: name.trim(),
        role: role.trim(),
        phone: phone.trim() ? phone.trim() : null,
        type,
      });

      setName("");
      setRole("");
      setPhone("");
      setAddModalOpen(false);
      await queryClient.invalidateQueries();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create contact");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this emergency contact?")) return;
    try {
      await deleteContactMutation.mutateAsync({ id });
      await queryClient.invalidateQueries();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <>
      <Card
        variant="default"
        className="border border-border-gold/30 bg-card p-4 sm:p-5 rounded-2xl shadow-xs"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-gold/20">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <PhoneCall className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-serif font-bold text-foreground">
                Emergency & Caretaker Directory
              </h3>
              <p className="text-[11px] text-foreground-muted">
                Essential helplines for {buildingName}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="text-xs h-9 min-h-[36px] flex items-center gap-1.5"
          >
            <Plus className="size-3.5" />
            Add Helpline
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="p-3 rounded-xl bg-surface/70 border border-border flex items-center justify-between group hover:border-border/80 transition-all"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-foreground truncate">{contact.name}</p>
                  <Badge
                    variant="outline"
                    className="text-[9px] py-0 px-1 font-bold uppercase tracking-wider text-primary border-primary/20"
                  >
                    {contact.type}
                  </Badge>
                </div>
                <p className="text-[11px] text-foreground-muted truncate">{contact.role}</p>

                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-1 tabular-nums"
                  >
                    <Phone className="size-3" />
                    {contact.phone}
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleDelete(contact.id)}
                className="opacity-0 group-hover:opacity-100 text-foreground-muted hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all min-h-[32px] min-w-[32px] flex items-center justify-center"
                title="Delete contact"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}

          {contacts.length === 0 && (
            <div className="col-span-full py-4 text-center text-xs text-foreground-muted">
              No emergency contacts configured yet.
            </div>
          )}
        </div>
      </Card>

      {/* Add Contact Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md bg-card border-border-gold/30 shadow-2xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-serif font-bold text-foreground">
              Add Emergency Contact
            </DialogTitle>
            <DialogDescription className="text-foreground-muted text-xs">
              Add a contact for building security, police, fire, or utility emergencies.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAddContact} className="space-y-3.5 mt-2">
            <div className="space-y-1">
              <Label htmlFor="contact-name" className="text-xs font-semibold text-foreground">
                Contact or Station Name
              </Label>
              <Input
                id="contact-name"
                placeholder="e.g. Dhanmondi Police Station or Caretaker Rafiq"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs bg-background border-border"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="contact-role" className="text-xs font-semibold text-foreground">
                Designation / Service
              </Label>
              <Input
                id="contact-role"
                placeholder="e.g. Local Police Thana or Electrician"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-9 text-xs bg-background border-border"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="contact-phone" className="text-xs font-semibold text-foreground">
                Phone Number / Hotline
              </Label>
              <Input
                id="contact-phone"
                placeholder="e.g. 01712345678 or 999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-xs bg-background border-border"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="contact-type" className="text-xs font-semibold text-foreground">
                Directory Category
              </Label>
              <select
                id="contact-type"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                aria-label="Directory Category"
                className="w-full h-9 px-3 bg-background border border-border text-xs rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="building">Internal Building Caretaker / Guard</option>
                <option value="nearby">External Emergency Service (Police/Fire/WASA)</option>
              </select>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="luxury"
                size="sm"
                disabled={createContactMutation.isPending}
              >
                {createContactMutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin" /> Saving...
                  </span>
                ) : (
                  "Save Helpline"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
