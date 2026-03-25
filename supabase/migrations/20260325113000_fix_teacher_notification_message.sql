CREATE OR REPLACE FUNCTION public.app_book_reservation(
  p_parent_user_id text,
  p_slot_id text,
  p_consultation_type "ConsultationType"
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent "ParentUser"%ROWTYPE;
  v_slot "ReservationSlot"%ROWTYPE;
  v_teacher "TeacherUser"%ROWTYPE;
  v_reservation_id text;
  v_constraint text;
BEGIN
  SELECT * INTO v_parent
  FROM "ParentUser"
  WHERE id = p_parent_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'NOT_FOUND';
  END IF;

  SELECT * INTO v_slot
  FROM "ReservationSlot"
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'NOT_ALLOWED';
  END IF;

  IF v_slot.grade <> v_parent.grade OR v_slot.classroom <> COALESCE(v_parent.classroom, 0) THEN
    RETURN 'NOT_ALLOWED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Reservation"
    WHERE "parentUserId" = v_parent.id
  ) THEN
    RETURN 'ALREADY_RESERVED';
  END IF;

  IF v_slot.status = 'BLOCKED' THEN
    RETURN 'BLOCKED';
  END IF;

  IF v_slot.status = 'BOOKED' OR EXISTS (
    SELECT 1
    FROM "Reservation"
    WHERE "slotId" = v_slot.id
  ) THEN
    RETURN 'TAKEN';
  END IF;

  v_reservation_id := public.app_make_id();

  INSERT INTO "Reservation" (
    id,
    "parentUserId",
    "slotId",
    "consultationType",
    "updatedAt"
  ) VALUES (
    v_reservation_id,
    v_parent.id,
    v_slot.id,
    p_consultation_type,
    CURRENT_TIMESTAMP
  );

  UPDATE "ReservationSlot"
  SET
    status = 'BOOKED',
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = v_slot.id;

  SELECT * INTO v_teacher
  FROM "TeacherUser"
  WHERE grade = v_slot.grade
    AND classroom = v_slot.classroom;

  IF FOUND THEN
    INSERT INTO "TeacherNotification" (
      id,
      "teacherUserId",
      "reservationId",
      title,
      message
    ) VALUES (
      public.app_make_id(),
      v_teacher.id,
      v_reservation_id,
      '새 상담 신청',
      format(
        '%s 학생이 %s %s 상담을 신청했습니다.',
        v_parent."studentName",
        to_char(v_slot."startDateTime", 'FMMM"월" FMDD"일"'),
        v_slot."timeLabel"
      )
    );
  END IF;

  RETURN 'SUCCESS';
EXCEPTION
  WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;

    IF v_constraint = 'Reservation_parentUserId_key' THEN
      RETURN 'ALREADY_RESERVED';
    END IF;

    IF v_constraint = 'Reservation_slotId_key' THEN
      RETURN 'TAKEN';
    END IF;

    RETURN 'TAKEN';
END;
$$;
