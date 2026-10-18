import type { ProductType } from "@omniheaven/validators";
import {
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  DoorOpen,
  Globe,
  Home,
  LayoutDashboard,
  Paintbrush,
  Receipt,
  Users,
  Wrench,
} from "lucide-react";

export interface NavItem {
  id: string;
  labelKey: string;
  defaultLabel: string;
  href: string;
  icon: any;
}

export const hotelNavItems: NavItem[] = [
  {
    id: "overview",
    labelKey: "nav.hotel.overview",
    defaultLabel: "Overview",
    href: "/overview",
    icon: LayoutDashboard,
  },
  {
    id: "bookings",
    labelKey: "nav.hotel.bookings",
    defaultLabel: "Reservations",
    href: "/bookings",
    icon: CalendarDays,
  },
  {
    id: "rooms",
    labelKey: "nav.hotel.rooms",
    defaultLabel: "Rooms & Suites",
    href: "/rooms",
    icon: DoorOpen,
  },
  {
    id: "website-builder",
    labelKey: "nav.hotel.websiteBuilder",
    defaultLabel: "Website Builder",
    href: "/website-builder",
    icon: Paintbrush,
  },
  {
    id: "domains",
    labelKey: "nav.hotel.domains",
    defaultLabel: "Custom Domain",
    href: "/domains",
    icon: Globe,
  },
  {
    id: "staff",
    labelKey: "nav.hotel.staff",
    defaultLabel: "Team & Roles",
    href: "/staff",
    icon: Users,
  },
  {
    id: "billing",
    labelKey: "nav.hotel.finance",
    defaultLabel: "Billing & Subscription",
    href: "/billing",
    icon: CreditCard,
  },
];

export const buildingNavItems: NavItem[] = [
  {
    id: "overview",
    labelKey: "nav.building.overview",
    defaultLabel: "Overview",
    href: "/overview",
    icon: LayoutDashboard,
  },
  {
    id: "buildings",
    labelKey: "nav.building.buildings",
    defaultLabel: "Buildings & Flats",
    href: "/buildings",
    icon: Building2,
  },
  {
    id: "renters",
    labelKey: "nav.building.renters",
    defaultLabel: "Renters & Leases",
    href: "/renters",
    icon: Home,
  },
  {
    id: "bills",
    labelKey: "nav.building.bills",
    defaultLabel: "Bills & Utility",
    href: "/bills",
    icon: Receipt,
  },
  {
    id: "payments",
    labelKey: "nav.building.payments",
    defaultLabel: "Rent Payments",
    href: "/payments",
    icon: CreditCard,
  },
  {
    id: "maintenance",
    labelKey: "nav.building.maintenance",
    defaultLabel: "Maintenance",
    href: "/maintenance",
    icon: Wrench,
  },
  {
    id: "notices",
    labelKey: "nav.building.notices",
    defaultLabel: "Notices",
    href: "/notices",
    icon: Bell,
  },
  {
    id: "team",
    labelKey: "nav.building.team",
    defaultLabel: "Team & Roles",
    href: "/team",
    icon: Users,
  },
  {
    id: "billing",
    labelKey: "nav.building.billing",
    defaultLabel: "Billing & Subscription",
    href: "/billing",
    icon: CreditCard,
  },
];

export function getNavItemsForProductType(productType: ProductType): NavItem[] {
  if (productType === "hotel" || productType === "resort") {
    return hotelNavItems;
  }
  return buildingNavItems;
}
