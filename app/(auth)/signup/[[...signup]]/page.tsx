import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <SignUp
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: "#34d399",
          },
        }}
        fallbackRedirectUrl="/dashboard"
      />
    </main>
  );
}
