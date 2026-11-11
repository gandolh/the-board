import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface CollapsibleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The section's name for screen readers. */
  label: string;
  /** What the trigger shows beside its chevron. */
  trigger: ReactNode;
  /** Set when the trigger sits in a heading of this level. */
  heading?: "h3";
  className?: string;
  headingClassName?: string;
  triggerClassName?: string;
  panelClassName?: string;
  children?: ReactNode;
}

/**
 * A section that opens and closes from its trigger, drawn as a `<section>`.
 * The trigger is a button with a chevron that turns when the panel is open.
 */
export function Collapsible({
  open,
  onOpenChange,
  label,
  trigger,
  heading,
  className,
  headingClassName,
  triggerClassName,
  panelClassName,
  children,
}: CollapsibleProps) {
  const button = (
    <BaseCollapsible.Trigger className={cn("group", triggerClassName)}>
      <svg
        className="size-4 flex-none transition-transform duration-150 group-data-panel-open:rotate-90 motion-reduce:transition-none"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path
          d="M6 4l4 4-4 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {trigger}
    </BaseCollapsible.Trigger>
  );
  return (
    <BaseCollapsible.Root
      open={open}
      onOpenChange={onOpenChange}
      render={<section className={className} aria-label={label} />}
    >
      {heading === "h3" ? <h3 className={headingClassName}>{button}</h3> : button}
      <BaseCollapsible.Panel className={panelClassName}>{children}</BaseCollapsible.Panel>
    </BaseCollapsible.Root>
  );
}
