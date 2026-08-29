import { PageHeader } from "@/components/PageHeader";
import { SignInForm } from "@/components/auth/AuthForms";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? params.next : undefined;

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title="Welcome back"
        description="Email and password. Then you're back in for today's experiment."
      />
      <SignInForm nextPath={nextPath} />
    </main>
  );
}
