import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "~/lib/trpc";

import "./server-health.scss";

export function ServerHealth() {
  const trpc = useTRPC();
  const health = useQuery(trpc.health.queryOptions());

  // One region that stays in the page, so assistive technology announces its changing text.
  return (
    <p className="server-health" role="status">
      {health.isPending && "Asking the server…"}
      {health.isError && "The server didn't answer."}
      {health.isSuccess && `Server is ${health.data.status}, version ${health.data.version}`}
    </p>
  );
}
