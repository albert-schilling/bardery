import { useQuery } from "@tanstack/react-query";

import { Greeting } from "~/components/greeting/greeting";
import { ServerHealth } from "~/components/server-health/server-health";
import { SignOut } from "~/components/sign-out/sign-out";
import { useTRPC } from "~/lib/trpc";

export function meta() {
  return [{ title: "Bardery" }];
}

export default function Home() {
  const trpc = useTRPC();
  const me = useQuery(trpc.me.queryOptions());

  return (
    <main>
      <Greeting name="Bardery" large />
      {me.isSuccess && <SignOut email={me.data.email} />}
      <ServerHealth />
    </main>
  );
}
