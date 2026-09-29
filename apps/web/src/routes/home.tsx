import { Greeting } from "~/components/greeting/greeting";

export function meta() {
  return [{ title: "Bardery" }];
}

export default function Home() {
  return (
    <main>
      <Greeting name="Bardery" large />
    </main>
  );
}
