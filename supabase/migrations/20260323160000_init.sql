-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('PARENT', 'TEACHER');

-- CreateEnum
CREATE TYPE "ConsultationType" AS ENUM ('PHONE', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('OPEN', 'BLOCKED', 'BOOKED');

-- CreateTable
CREATE TABLE "ParentUser" (
    "id" TEXT NOT NULL,
    "loginId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "classroom" INTEGER,
    "studentNumber" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherUser" (
    "id" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "classroom" INTEGER NOT NULL,
    "teacherName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userType" "UserType" NOT NULL,
    "parentUserId" TEXT,
    "teacherUserId" TEXT,
    "privacyConsent" BOOLEAN NOT NULL,
    "thirdPartyConsent" BOOLEAN NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassScheduleConfig" (
    "id" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "classroom" INTEGER NOT NULL,
    "weekKey" TEXT NOT NULL,
    "slotIntervalMinutes" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassScheduleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationSlot" (
    "id" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "classroom" INTEGER NOT NULL,
    "weekKey" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeLabel" TEXT NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "consultationType" "ConsultationType" NOT NULL DEFAULT 'IN_PERSON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherNotification" (
    "id" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "reservationId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentUser_loginId_key" ON "ParentUser"("loginId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherUser_grade_classroom_key" ON "TeacherUser"("grade", "classroom");

-- CreateIndex
CREATE INDEX "ConsentRecord_userType_consentedAt_idx" ON "ConsentRecord"("userType", "consentedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClassScheduleConfig_grade_classroom_weekKey_key" ON "ClassScheduleConfig"("grade", "classroom", "weekKey");

-- CreateIndex
CREATE INDEX "ReservationSlot_grade_classroom_weekKey_date_idx" ON "ReservationSlot"("grade", "classroom", "weekKey", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationSlot_grade_classroom_startDateTime_key" ON "ReservationSlot"("grade", "classroom", "startDateTime");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_parentUserId_key" ON "Reservation"("parentUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_slotId_key" ON "Reservation"("slotId");

-- CreateIndex
CREATE INDEX "TeacherNotification_teacherUserId_isRead_createdAt_idx" ON "TeacherNotification"("teacherUserId", "isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "ParentUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "TeacherUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationSlot" ADD CONSTRAINT "ReservationSlot_grade_classroom_weekKey_fkey" FOREIGN KEY ("grade", "classroom", "weekKey") REFERENCES "ClassScheduleConfig"("grade", "classroom", "weekKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "ParentUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ReservationSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherNotification" ADD CONSTRAINT "TeacherNotification_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "TeacherUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherNotification" ADD CONSTRAINT "TeacherNotification_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

