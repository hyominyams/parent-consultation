import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AuthExperience } from "@/components/auth/auth-experience";
import { redirectAuthenticatedUser } from "@/lib/auth/guards";

type AuthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  await redirectAuthenticatedUser();
  const params = await searchParams;
  const role = params.role === "teacher" ? "TEACHER" : "PARENT";

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <AuthExperience initialRole={role} />
      <SiteFooter />
    </main>
  );
}
