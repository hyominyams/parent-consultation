import { SlotStatus } from "@prisma/client";

export function getReservationBlockReason(input: {
  hasExistingReservation: boolean;
  slotStatus: SlotStatus;
  hasSlotReservation: boolean;
}) {
  if (input.hasExistingReservation) {
    return "ALREADY_RESERVED";
  }

  if (input.slotStatus === SlotStatus.BLOCKED) {
    return "BLOCKED";
  }

  if (input.slotStatus === SlotStatus.BOOKED || input.hasSlotReservation) {
    return "TAKEN";
  }

  return null;
}
