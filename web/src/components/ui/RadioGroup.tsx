import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { Fragment, type ReactNode } from "react";

export interface RadioOption<Value extends string> {
  value: Value;
  label: ReactNode;
  className?: string;
}

export interface RadioGroupProps<Value extends string> {
  /** The group's name for screen readers. */
  label: string;
  options: readonly RadioOption<Value>[];
  /** The chosen option, or null while none is: a filter that is off. */
  value: Value | null;
  onValueChange: (value: Value) => void;
  className?: string;
  optionClassName?: string;
  /** Shown before the options. The group's own label already names it, so give it `aria-hidden`. */
  prefix?: ReactNode;
  /** Drawn between the options; give it `aria-hidden`. */
  separator?: ReactNode;
}

/**
 * One choice from a few, as a filter: Tab enters the group once, and the arrow
 * keys move and choose. A radio can't be unchecked, so a filter that can be
 * off clears from a control beside the group.
 */
export function RadioGroup<Value extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
  optionClassName,
  prefix,
  separator,
}: RadioGroupProps<Value>) {
  return (
    <BaseRadioGroup<Value>
      aria-label={label}
      // "" matches no option, which keeps the group controlled while nothing is chosen.
      value={value ?? ("" as Value)}
      onValueChange={onValueChange}
      className={className}
    >
      {prefix}
      {options.map((option, index) => (
        <Fragment key={option.value}>
          {index > 0 && separator}
          <Radio.Root value={option.value} className={`${optionClassName ?? ""} ${option.className ?? ""}`.trim()}>
            {option.label}
          </Radio.Root>
        </Fragment>
      ))}
    </BaseRadioGroup>
  );
}
