import { SignInForm } from "~/components/sign-in-form/sign-in-form";

export function meta() {
  return [{ title: "Sign in · Bardery" }];
}

export default function SignIn() {
  return (
    <main>
      <SignInForm />
    </main>
  );
}
