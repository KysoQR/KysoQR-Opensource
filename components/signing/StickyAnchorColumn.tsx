'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';

/**
 * One of the 3 "sticky" columns on the signing wizard's step 1 (signer-info
 * form / PDF / signature-history) -- see `SigningWizard.tsx`'s module-level
 * comment for why `top`-sticky (not `bottom`) is what actually works here.
 *
 * Renders the "rail" itself (the always-static box that, at `lg` and up,
 * gives a shorter column room to stick/scroll within relative to whichever
 * of the 3 columns ends up tallest -- via the grid's own default
 * `align-items: stretch`, not a JS-applied `minHeight`; see the render
 * below) plus, inside it, one of two treatments for the actual content,
 * decided from this column's own measured height vs. the viewport:
 *
 * 1. A column whose content fits below the sticky header
 *    (`contentHeight <= viewportHeight - stickyOffset`): plain native
 *    `position: sticky; top: stickyOffset`. Applied unconditionally whenever
 *    it fits -- including to whichever column ends up tallest, which is a
 *    deliberate, provable no-op for that column specifically: its rail is
 *    exactly as tall as its own content (`railHeight === contentHeight`), so
 *    the scroll position at which it would start sticking is identical to
 *    the one at which it would release, i.e. zero stick range. So there's
 *    nothing to gain from special-casing it out of this branch, and one
 *    less discrete condition (no rail-slack comparison here) means one less
 *    thing that can flip between two renders when a sibling's content
 *    changes size. Releases once the rail's bottom (the tallest column's
 *    own content, for every column but the tallest one itself) has scrolled
 *    past.
 * 2. A column whose content is STILL taller than that: visually
 *    "anchored" (doesn't drift with the page) via `position: sticky` on a
 *    height-capped, clipped window, but the content inside is progressively
 *    shifted upward (`transform: translateY`) as the page scrolls through
 *    this column's "stuck" phase -- driven entirely by the single outer
 *    page scroll (a scroll listener recomputing a plain CSS transform
 *    against the RAIL's own live position, never this column's own
 *    stuck/constant position), never a second, separately-scrollable
 *    element of its own. By the time this column would normally release,
 *    the transform has already reached its max and the full content has
 *    scrolled into view -- nothing stays permanently hidden.
 */
export function StickyAnchorColumn({
  railHeight,
  railClassName,
  contentHeight,
  stickyOffset,
  viewportHeight,
  isLgUp,
  className,
  contentRef: externalContentRef,
  children,
}: {
  /** Shared across all 3 columns -- the max of their measured heights, so
   * this rail matches whichever ends up tallest. `undefined` until at
   * least one column has been measured (mirrors the existing convention:
   * `Math.max(...) || undefined`). */
  railHeight: number | undefined;
  /** Applied to the rail (outer) div -- e.g. spacing between this column
   * and its neighbor, on top of the grid's own `gap`. */
  railClassName?: string;
  /** This column's own real rendered content height (0 until measured). */
  contentHeight: number;
  /** Sticky header's measured height -- the `top` offset to anchor to. */
  stickyOffset: number;
  viewportHeight: number;
  isLgUp: boolean;
  /** Applied to the actual content div. */
  className?: string;
  /** The content div also needs measuring by the caller (to compute the
   * shared `railHeight` above) -- caller passes its own
   * `useHeightObserver`-style ref callback here, attached to the SAME
   * element this component measures internally. */
  contentRef: (el: HTMLDivElement | null) => void;
  children: ReactNode;
}) {
  const usableHeight = viewportHeight - stickyOffset;
  const fitsWithoutClipping = contentHeight > 0 && contentHeight <= usableHeight;
  const isMeasured = isLgUp && contentHeight > 0;
  // Only gates the clip+reveal branch now, not plain sticky (see the class
  // doc comment above) -- the clipped wrapper below sets an EXPLICIT
  // `height: usableHeight`, capping this column's own contribution to the
  // grid row's height at the viewport's usable height instead of its true
  // content height. Applying that to the column that's actually tallest
  // would corrupt the whole page's scroll length (the row would size to a
  // shorter-than-reality height). "Is this column the tallest" is the one
  // thing here that can't be expressed as pure CSS, so it stays a JS
  // comparison -- but only for this one branch.
  const hasRailSlack = railHeight !== undefined && railHeight > contentHeight;
  const plainSticky = isMeasured && fitsWithoutClipping;
  const needsScrollReveal = isMeasured && hasRailSlack && !fitsWithoutClipping;

  // Always the true, always-static rail -- NOT the sticky content itself.
  // Reading scroll progress off the sticky element's own rect would be
  // self-defeating: once it's actually stuck, its `top` is constant by
  // definition, so it could never report "how far past the stick point
  // are we" (this was the actual bug in an earlier draft of this file).
  const railRef = useRef<HTMLDivElement | null>(null);
  const translateTargetRef = useRef<HTMLDivElement | null>(null);
  const setTranslateTargetRef = useCallback(
    (el: HTMLDivElement | null) => {
      translateTargetRef.current = el;
      externalContentRef(el);
    },
    [externalContentRef]
  );

  useEffect(() => {
    if (!needsScrollReveal) return;
    const maxHiddenPx = contentHeight - usableHeight;
    let rafId: number | null = null;

    const apply = () => {
      rafId = null;
      const rail = railRef.current;
      const target = translateTargetRef.current;
      if (!rail || !target) return;
      const railTop = rail.getBoundingClientRect().top;
      // How far into this column's "stuck" phase we are: 0 at the moment
      // it would start sticking, growing as the page scrolls further --
      // the same quantity native `position: sticky` tracks internally,
      // just read back out here via the rail's own live (never-stuck)
      // position.
      const stuckProgressPx = stickyOffset - railTop;
      const revealPx = Math.min(Math.max(stuckProgressPx, 0), maxHiddenPx);
      target.style.transform = revealPx > 0 ? `translateY(-${revealPx}px)` : '';
    };

    const onScroll = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      const target = translateTargetRef.current;
      if (target) target.style.transform = '';
    };
  }, [needsScrollReveal, stickyOffset, contentHeight, usableHeight]);

  return (
    <div
      ref={railRef}
      className={railClassName}
      // Below `lg` the grid collapses to a single stacked column (no
      // `lg:grid-cols-[...]` template applies), so there's no sibling row to
      // match heights against -- applying `railHeight` there anyway would
      // just force dead space under every shorter column.
      style={isLgUp ? { minHeight: railHeight } : undefined}
    >
      {/* A single, unconditional DOM shape (rail > positioning wrapper >
          content) -- `needsScrollReveal`/`plainSticky` only ever toggle
          classNames/styles on the positioning wrapper below, never which
          elements exist or how deep `children` sits. Two structurally
          different branches here (as an earlier version had: a whole extra
          wrapper div only in the reveal case) meant flipping between them
          changed `children`'s position in the tree, which React can't
          reconcile across -- it unmounts and remounts `children` from
          scratch. For a PDF-rendering child like `SignaturePlacement`, that
          silently threw away all render state (pdf.js document handle,
          rendered canvases, zoom, scroll) and restarted from "loading"
          every time a sibling column's height change flipped this branch. */}
      <div
        className={
          needsScrollReveal ? 'lg:sticky lg:overflow-hidden' : plainSticky ? 'lg:sticky' : undefined
        }
        style={
          needsScrollReveal
            ? { top: stickyOffset, height: usableHeight }
            : plainSticky
              ? { top: stickyOffset }
              : undefined
        }
      >
        <div ref={setTranslateTargetRef} className={className}>
          {children}
        </div>
      </div>
    </div>
  );
}
