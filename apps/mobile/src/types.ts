export type PropertyType = "hotel" | "building";

export interface MobileOverviewStats {
  todayCheckIns: number;
  availableRooms: number;
  occupiedRooms: number;
  pendingMaintenance: number;
  monthlyRevenueBdt: number;
  unpaidRentCount: number;
}

export interface MobileBookingAlert {
  id: string;
  guestName: string;
  roomName: string;
  checkInDate: string;
  totalPrice: number;
  paymentStatus: "paid" | "unpaid" | "partially_paid";
  status: "confirmed" | "checked_in" | "checked_out";
}

export interface MobileTenantSummary {
  id: string;
  flatNumber: string;
  tenantName: string;
  phone: string;
  rentAmount: number;
  billStatus: "paid" | "unpaid" | "overdue";
  dueDate: string;
}

export interface MobileMaintenanceTicket {
  id: string;
  unit: string;
  category: "plumbing" | "electrical" | "ac" | "carpentry" | "other";
  title: string;
  urgency: "low" | "medium" | "urgent";
  status: "open" | "assigned" | "resolved";
  reportedDate: string;
}
