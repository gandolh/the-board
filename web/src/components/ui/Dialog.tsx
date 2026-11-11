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
 * goes to the close button on open and back to the card on close.
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
        <BaseDialog.Popup className="panel" aria-label={label} initialFocus={closeRef} render={<aside />}>
          <div className="panel-top">
            {top}
            <BaseDialog.Close ref={closeRef} className="icon-button" aria-label="Close">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </BaseDialog.Close>
          </div>
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

/** The panel's heading. Once it is on screen it names the panel, in place of the label. */
export function PanelTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <BaseDialog.Title className={className}>{children}</BaseDialog.Title>;
}
