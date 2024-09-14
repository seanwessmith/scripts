export type TimeSlot = [string, string];
export type CourtAvailability = TimeSlot[];

export interface TennisCourt {
  name: string;
  availability: CourtAvailability[];
  // url: string;
}

export interface ReservationSystem {
  dates: {
    [date: string]: CourtSchedule[];
  };
  reservations: {
    [id: string]: Reservation;
  };
  users: {
    [id: string]: User;
  };
  instructors: {
    [id: string]: unknown;
  };
  classes: {
    [id: string]: Class;
  };
}

export interface CourtSchedule {
  courtNumber: string;
  sports: Sport[];
  schedule: {
    [timeSlot: string]: ScheduleItem;
  };
}

export interface Sport {
  id: string;
  name: string;
}

export interface ScheduleItem {
  referenceType: "RESERVATION" | "RESERVABLE" | "OPEN";
  referenceId?: string;
  referenceLabel?: string;
}

export interface Reservation {
  capacity: number;
  classId: string | null;
  doNotMarket: boolean;
  groupsOnly: boolean | null;
  guestPrice: number;
  id: string;
  instructorId: string | null;
  linkedReservationId: string;
  locationId: string;
  paid: boolean;
  reservationCost: number;
  reservationCostCurrency: string;
  reservationType: string;
  users: string[];
  courts: string[];
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  image: string | null;
  skillLevel: string;
  primarySportId: string | null;
}

export interface Class {
  id: string;
  createdAt: string;
  updatedAt: string;
  instructorId: string | null;
  sportId: string;
  locationId: string | null;
  name: string;
  description: string | null;
  enforceRecommendedLevel: boolean;
  price: number;
  currency: string;
  allowGuests: boolean;
  guestPrice: number;
  guestCurrency: string;
  type: string;
  defaultReservationWindow: string | null;
  equipmentIncluded: boolean;
  recommendedLevel: string | null;
  images: {
    class152x89: string | null;
    class152x240: string | null;
    class240x140: string | null;
  };
  doNotMarket: boolean;
  organizationId: string;
  capacity: number;
  glCode: string | null;
}
