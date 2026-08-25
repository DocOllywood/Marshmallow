import { PageHeader } from "@/components/PageHeader";
import { ResetPasswordForm } from "@/components/auth/PasswordForms";

export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title="Choose a new password"
        description="This page only works after you open the reset link from email."
      />
      <ResetPasswordForm />
    </main>
  );
}
