import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "~/lib/trpc";

export function ServerHealth() {
  const trpc = useTRPC();
  const health = useQuery(trpc.health.queryOptions());

  if (health.isPending) return <p>Asking the server…</p>;
  if (health.isError) return <p role="alert">The server didn't answer.</p>;
  return (
    <p>
      Server is {health.data.status}, version {health.data.version}
    </p>
  );
}
