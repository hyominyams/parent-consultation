import type { SlotStatus } from "@/lib/db/types";

export const BLOCKED_SLOT_MESSAGE = "해당 시간은 신청할 수 없습니다.";
export const TAKEN_SLOT_MESSAGE = "이미 해당 날짜와 시간에 예약이 있습니다. 다른 시간을 선택해주세요.";

export function getReservationBlockReason(input: {
  hasExistingReservation: boolean;
  slotStatus: SlotStatus;
  hasSlotReservation: boolean;
}) {
  if (input.hasExistingReservation) {
    return "ALREADY_RESERVED";
  }

  if (input.slotStatus === "BLOCKED") {
    return "BLOCKED";
  }

  if (input.slotStatus === "BOOKED" || input.hasSlotReservation) {
    return "TAKEN";
  }

  return null;
}
