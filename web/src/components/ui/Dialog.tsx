import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { useRef, type ReactNode } from "react";

export interface PanelProps {
  /** The panel's name for screen readers until its `PanelTitle` is on screen. */
  label: string;
  /** What sits beside the close button, at the top. */
  top?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
}

/**
 * The board's side panel: a non-modal dialog that stays mounted while it is
 * shown. The board behind it stays usable, only Escape or the close button
 * dismiss it (a click on another card switches the ticket instead), and focus
 * goes to the close button on open and back to the card on close. Under 720 px
 * it is a sheet on the bottom edge, with the top of the screen dimmed above it.
 */
export function Panel({ label, top, onClose, children }: PanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <BaseDialog.Root
      open
      modal={false}
      disablePointerDismissal
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <BaseDialog.Portal>
        {/* The phone's sheet leaves the top of the screen showing, dimmed. It only dims: the board stays usable. */}
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-9 hidden h-19 bg-scrim/55 dark:bg-scrim/60 phone:block"
          aria-hidden="true"
        />
        <BaseDialog.Popup
          className="fixed inset-y-0 right-0 z-panel flex w-full max-w-120 flex-col overflow-y-auto border-l border-l-transparent bg-surface shadow-panel dark:border-l-line dark:shadow-none phone:inset-x-0 phone:top-19 phone:max-w-none phone:rounded-t-[16px] phone:border-t phone:border-t-line phone:shadow-sheet phone:dark:shadow-none"
          aria-label={label}
          initialFocus={closeRef}
          render={<aside />}
        >
          <div className="flex min-h-14 items-center gap-2 pt-3 pr-3 pl-5 phone:min-h-14 phone:pt-1 phone:pr-2 phone:pl-4">
            {top}
            <BaseDialog.Close
              ref={closeRef}
              className="ml-auto grid size-10 cursor-pointer place-items-center rounded-card border border-transparent hover:border-line hover:bg-surface-sunk"
              aria-label="Close"
            >
              <svg className="size-4" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </BaseDialog.Close>
          </div>
          <div className="flex flex-col gap-5 px-5 pb-6 phone:px-4 phone:pb-8">{children}</div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

/** The panel's heading. Once it is on screen it names the panel, in place of the label. */
export function PanelTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <BaseDialog.Title className={className}>{children}</BaseDialog.Title>;
}
