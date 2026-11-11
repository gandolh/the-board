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
      optionClassName="cursor-pointer rounded-box border border-line px-3 py-1 hover:bg-surface-sunk data-checked:border-accent data-checked:bg-accent/15 data-checked:font-semibold"
      options={THEMES}
      value={useTheme()}
      onValueChange={setTheme}
    />
  );
}
