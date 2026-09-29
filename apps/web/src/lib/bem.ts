export type Modifiers = Record<string, boolean | undefined>;

/**
 * Class names for a BEM block or element and its enabled modifiers:
 * `bem("greeting", { large: true })` returns `"greeting greeting--large"`.
 */
export function bem(blockOrElement: string, modifiers: Modifiers = {}): string {
  const modifierClasses = Object.entries(modifiers)
    .filter(([, enabled]) => enabled === true)
    .map(([name]) => `${blockOrElement}--${toKebabCase(name)}`);
  return [blockOrElement, ...modifierClasses].join(" ");
}

function toKebabCase(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
