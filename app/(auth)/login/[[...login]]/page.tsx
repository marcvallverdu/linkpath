import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <SignIn
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
