"use server";

import { revalidatePath } from "next/cache";

import { requireParentSession } from "@/lib/auth/guards";
import { getParentUserById, getReservationByParentUserId } from "@/lib/db/queries";
import { callRpc } from "@/lib/db/rpc";
import { BLOCKED_SLOT_MESSAGE, TAKEN_SLOT_MESSAGE } from "@/lib/reservations";
import { reservationActionSchema } from "@/lib/validators";
import type { ActionState } from "@/types/action-state";

function reservationErrorState(code: string): ActionState {
  switch (code) {
    case "ALREADY_RESERVED":
      return {
        status: "error",
        message: "이미 상담을 신청하셨습니다. 대시보드에서 수정 또는 삭제해주세요.",
      };
    case "BLOCKED":
      return {
        status: "error",
        message: BLOCKED_SLOT_MESSAGE,
      };
    case "TAKEN":
    case "DUPLICATE_DATE":
      return {
        status: "error",
        message: TAKEN_SLOT_MESSAGE,
      };
    default:
      return {
        status: "error",
        message: "예약 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      };
  }
}

export async function bookReservationAction(
  slotId: string,
  consultationType: "PHONE" | "IN_PERSON",
): Promise<ActionState> {
  const session = await requireParentSession();
  const parsed = reservationActionSchema.safeParse({ slotId, consultationType });

  if (!parsed.success) {
    return {
      status: "error",
      message: "잘못된 슬롯 요청입니다.",
    };
  }

  let resultCode: string;

  try {
    resultCode = await callRpc(
      "app_book_reservation",
      {
        p_parent_user_id: session.userId,
        p_slot_id: parsed.data.slotId,
        p_consultation_type: parsed.data.consultationType,
      },
      "Failed to book reservation.",
    );
  } catch {
    return reservationErrorState("UNKNOWN");
  }

  if (resultCode !== "SUCCESS") {
    return reservationErrorState(resultCode);
  }

  revalidatePath("/reserve");
  revalidatePath("/dashboard");
  revalidatePath("/teacher/dashboard");
  revalidatePath("/teacher/settings");
  revalidatePath("/teacher/availability");

  return {
    status: "success",
    message: "상담 신청이 완료되었습니다.",
    redirectTo: "/dashboard",
  };
}

export async function deleteReservationAction(
  intent: "delete" | "reschedule" = "delete",
): Promise<ActionState> {
  const session = await requireParentSession();
  const parent = await getParentUserById(session.userId);

  if (!parent) {
    return {
      status: "error",
      message: "삭제할 예약이 없습니다.",
    };
  }

  const reservation = await getReservationByParentUserId(parent.id);

  if (!reservation) {
    return {
      status: "error",
      message: "삭제할 예약이 없습니다.",
    };
  }

  let resultCode: string;

  try {
    resultCode = await callRpc(
      "app_delete_reservation",
      {
        p_parent_user_id: session.userId,
        p_intent: intent,
      },
      "Failed to delete reservation.",
    );
  } catch {
    return {
      status: "error",
      message: "예약 삭제 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  if (resultCode !== "SUCCESS") {
    return {
      status: "error",
      message: "예약 삭제 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  revalidatePath("/reserve");
  revalidatePath("/dashboard");
  revalidatePath("/teacher/dashboard");
  revalidatePath("/teacher/settings");
  revalidatePath("/teacher/availability");

  return {
    status: "success",
    message:
      intent === "reschedule"
        ? "기존 예약이 취소되었습니다. 새 시간을 선택해주세요."
        : "신청 내역이 삭제되었습니다.",
    redirectTo: intent === "reschedule" ? "/reserve" : "/dashboard",
  };
}
