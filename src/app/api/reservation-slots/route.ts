import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import {
  getParentUserById,
  getReservationByParentUserId,
  getReservationSlotsByClassroom,
} from "@/lib/db/queries";
import { toClassroomValue } from "@/lib/utils";

export async function GET() {
  const session = await getSession();

  if (!session || session.userType !== "PARENT") {
    return NextResponse.json(
      {
        message: "Unauthorized",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  }

  const parent = await getParentUserById(session.userId);

  if (!parent) {
    return NextResponse.json(
      {
        message: "Parent not found",
      },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  }

  const classroom = toClassroomValue(parent.classroom);
  const [reservation, slots] = await Promise.all([
    getReservationByParentUserId(parent.id),
    getReservationSlotsByClassroom(parent.grade, classroom),
  ]);

  return NextResponse.json(
    {
      hasReservation: Boolean(reservation),
      slots: slots.map((slot) => ({
        id: slot.id,
        status: slot.status,
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    },
  );
}
