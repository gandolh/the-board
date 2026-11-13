import { RadioGroup } from "./components/ui/RadioGroup";
import { setTheme, useTheme, type Theme } from "./lib/theme";

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/**
 * Light, Dark or System, kept on this device. A radio group, because nothing is saved to the server:
 * the board only reads.
 */
export function ThemeSwitch() {
  return (
    <RadioGroup<Theme>
      label="Theme"
      className="flex flex-wrap items-center gap-2"
      optionClassName="inline-flex min-h-8 cursor-pointer items-center rounded-card border border-outline bg-surface px-3 text-small font-medium hover:bg-surface-sunk data-checked:border-ink data-checked:bg-surface-sunk data-checked:font-bold phone:min-h-10"
      options={THEMES}
      value={useTheme()}
      onValueChange={setTheme}
    />
  );
}
