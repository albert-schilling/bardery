import { bem } from "../../lib/bem";

import "./greeting.scss";

type GreetingProps = {
  name: string;
  large?: boolean;
};

export function Greeting({ name, large = false }: GreetingProps) {
  return (
    <div className={bem("greeting", { large })}>
      <h1 className="greeting__title">Hello, {name}</h1>
    </div>
  );
}
