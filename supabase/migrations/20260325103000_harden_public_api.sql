-- Raw SQL migrations do not auto-enable RLS in Supabase.
-- Keep all exposed tables deny-by-default unless an explicit policy is added later.
ALTER TABLE public."ParentUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TeacherUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ConsentRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ClassScheduleConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReservationSlot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Reservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TeacherNotification" ENABLE ROW LEVEL SECURITY;

-- These SECURITY DEFINER RPCs bypass table RLS, so they must not stay callable by anon/authenticated roles.
REVOKE EXECUTE ON FUNCTION public.app_book_reservation(text, text, public."ConsultationType")
FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.app_delete_reservation(text, text)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.app_book_reservation(text, text, public."ConsultationType")
TO service_role;
GRANT EXECUTE ON FUNCTION public.app_delete_reservation(text, text)
TO service_role;
