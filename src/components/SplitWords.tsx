import { Fragment } from 'react';

/**
 * Wraps each word in a clipping mask so it can slide up from below its own baseline
 * (animated by useSectionReveal via [data-word]). The text stays real, selectable and in order.
 */
export function SplitWords({ text }: { readonly text: string }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span className="-mt-[0.18em] inline-block overflow-hidden pt-[0.18em] pb-[0.06em] align-bottom">
            <span data-word className="inline-block will-change-transform">
              {word}
            </span>
          </span>
          {i < words.length - 1 && ' '}
        </Fragment>
      ))}
    </>
  );
}
