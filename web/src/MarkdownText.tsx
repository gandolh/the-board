import type { ReactNode } from "react";
import Markdown from "react-markdown";

/**
 * Ticket text rendered as Markdown. The elements are react-markdown's, not the app's, so what the
 * reset removed (margins, bullets, link colour) comes back here, on the wrapper.
 */
const LOOK = [
  "wrap-anywhere [&>:first-child]:mt-0 [&>:last-child]:mb-0",
  "[&_:is(blockquote,ol,p,pre,ul)]:my-2 [&_:is(h1,h2,h3,h4,h5,h6)]:my-2 [&_:is(h1,h2,h3,h4,h5,h6)]:font-bold",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:ml-5",
  "[&_a]:text-accent [&_a]:underline",
  "[&_pre]:overflow-x-auto [&_pre]:rounded-badge [&_pre]:bg-surface-sunk [&_pre]:p-2",
].join(" ");

export function MarkdownText({ children }: { children: string }): ReactNode {
  return (
    <div className={LOOK}>
      <Markdown skipHtml>{children}</Markdown>
    </div>
  );
}
