import { PageHeader } from "@/components/PageHeader";
import { ForgotPasswordForm } from "@/components/auth/PasswordForms";

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title="Reset password"
        description="We’ll email a reset link. Locally it lands in Inbucket on port 54324."
      />
      <ForgotPasswordForm />
    </main>
  );
}
