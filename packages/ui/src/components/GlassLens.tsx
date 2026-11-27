import { Fragment, useId, useLayoutEffect, useRef, useState } from 'react';

const ACTIVE = '[aria-pressed="true"],[aria-selected="true"],[aria-current="page"]';
// WebView2 (Chromium) can bend the backdrop through an SVG filter; WebKit ignores url() in backdrop-filter,
// so macOS gets the rim-lit pill without refraction.
const CAN_REFRACT = typeof navigator !== 'undefined' && /Chrome\//.test(navigator.userAgent);

const TRAVEL_MS = 520;

interface Box { x: number; y: number; w: number; h: number; r: number }

/**
 * Edge displacement map: red pushes sampling inward on x, blue on y, neutral grey in the middle.
 * Same idea as rust-glass: bend light along a rounded bevel near the outline, flat in the centre.
 */
function displacementMap({ w, h, r }: Box, edge: number) {
  const inner = `x='${edge}' y='${edge}' width='${Math.max(w - 2 * edge, 1)}' height='${Math.max(h - 2 * edge, 1)}' rx='${Math.max(r - edge, 0)}'`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><defs>`
    + `<linearGradient id='x'><stop offset='0' stop-color='#f00'/><stop offset='1' stop-color='#000'/></linearGradient>`
    + `<linearGradient id='y' x2='0' y2='1'><stop offset='0' stop-color='#00f'/><stop offset='1' stop-color='#000'/></linearGradient>`
    + `<filter id='b'><feGaussianBlur stdDeviation='${edge / 2}'/></filter></defs>`
    + `<rect width='${w}' height='${h}' fill='#000'/><rect width='${w}' height='${h}' fill='url(#x)'/>`
    + `<rect width='${w}' height='${h}' fill='url(#y)' style='mix-blend-mode:screen'/>`
    + `<rect ${inner} fill='rgb(128,0,128)' filter='url(#b)'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const channel = (row: number) => {
  const m = ['0 0 0 0 0', '0 0 0 0 0', '0 0 0 0 0', '0 0 0 1 0'];
  m[row] = ['1 0 0 0 0', '0 1 0 0 0', '0 0 1 0 0'][row];
  return m.join(' ');
};

/**
 * Liquid-glass selection thumb. Drop it as the first child of a `.seg` or `.nav` group:
 * it follows whichever child is pressed / selected / current, stretches while it travels,
 * swells while the group is pressed, and can be dragged across the group to pick an item.
 */
export function GlassLens() {
  const ref = useRef<HTMLSpanElement>(null);
  const filterId = `lens${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    const lens = ref.current;
    const group = lens?.parentElement;
    if (!lens || !group) return;
    let last: Box | null = null;
    const measure = () => {
      const active = group.querySelector<HTMLElement>(ACTIVE);
      if (!active) { last = null; setBox(null); return; }
      const next = {
        x: active.offsetLeft, y: active.offsetTop, w: active.offsetWidth, h: active.offsetHeight,
        r: parseFloat(getComputedStyle(lens).borderTopLeftRadius) || 8,
      };
      // Stretch only; the lens keeps one material throughout, so nothing swaps (and flickers) on landing.
      if (last && last.x !== next.x && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        lens.animate?.([{ scale: '1 1' }, { scale: '1.14 0.88', offset: 0.35 }, { scale: '1 1' }],
          { duration: TRAVEL_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
      }
      if (last) lens.dataset.ready = '';
      last = next;
      setBox(next);
    };
    measure();
    const mutations = new MutationObserver(measure);
    mutations.observe(group, { subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'aria-selected', 'aria-current'] });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resize?.observe(group);
    // Ready on the next frame so the first paint never slides in from the corner.
    const raf = requestAnimationFrame(() => { lens.dataset.ready = ''; });

    // Drag to scrub: the lens follows the pointer, takes the width of the item under it,
    // and releasing selects that item (through its own click handler / link).
    let drag: { id: number; startX: number; moved: boolean } | null = null;
    let swallowClick = false;
    const items = () => [...group.querySelectorAll<HTMLElement>(':scope > button:not(:disabled), :scope > a')];
    const itemAt = (clientX: number) => {
      const left = group.getBoundingClientRect().left;
      let best: HTMLElement | undefined;
      let bestDistance = Infinity;
      for (const item of items()) {
        const distance = Math.abs(left + item.offsetLeft + item.offsetWidth / 2 - clientX);
        if (distance < bestDistance) { best = item; bestDistance = distance; }
      }
      return best;
    };
    const finish = () => {
      drag = null;
      delete lens.dataset.dragging;
      delete lens.dataset.pressed;
      lens.style.translate = '';
      if (last) lens.style.width = `${last.w}px`;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('blur', finish);
    };
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || !last) return;
      // Stops WebKit starting a link drag or text selection, which steals the pointer mid-gesture.
      // Clicks still fire; only the mouse-compat events and focus-on-press are skipped.
      event.preventDefault();
      drag = { id: event.pointerId, startX: event.clientX, moved: false };
      lens.dataset.pressed = '';
      // Track on the window so leaving the bar, or a lost capture, never strands the gesture.
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', finish);
      window.addEventListener('blur', finish);
    };
    const onMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id || !last) return;
      if (!drag.moved) {
        if (Math.abs(event.clientX - drag.startX) < 4) return;
        drag.moved = true;
        lens.dataset.dragging = '';
      }
      event.preventDefault();
      const target = itemAt(event.clientX);
      const width = target?.offsetWidth ?? last.w;
      const pointer = event.clientX - group.getBoundingClientRect().left;
      const x = Math.min(Math.max(pointer - width / 2, 0), group.clientWidth - width);
      lens.style.width = `${width}px`;
      lens.style.translate = `${x - last.x}px 0`;
    };
    const onUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const moved = drag.moved;
      finish();
      if (!moved) return;
      const target = itemAt(event.clientX);
      if (target && !target.matches(ACTIVE)) target.click();
      // The browser's own click for this gesture must not select the item it started on.
      swallowClick = true;
      window.setTimeout(() => { swallowClick = false; }, 0);
    };
    const onClick = (event: MouseEvent) => {
      if (!swallowClick) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const block = (event: Event) => event.preventDefault();
    group.addEventListener('pointerdown', onDown);
    group.addEventListener('click', onClick, true);
    group.addEventListener('dragstart', block);
    return () => {
      mutations.disconnect(); resize?.disconnect(); cancelAnimationFrame(raf);
      finish();
      group.removeEventListener('pointerdown', onDown);
      group.removeEventListener('click', onClick, true);
      group.removeEventListener('dragstart', block);
    };
  }, []);

  const refract = CAN_REFRACT && box;
  const scale = box ? Math.min(box.h * 0.3, 12) : 0;
  return (
    <>
      <span ref={ref} className="lens" aria-hidden="true" data-refract={refract ? '' : undefined}
        style={box ? {
          width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)`,
          ['--lens-filter' as string]: refract ? `url(#${filterId})` : 'none',
        } : { opacity: 0 }} />
      {refract && (
        <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
          <filter id={filterId} x="0" y="0" width={box.w} height={box.h} filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB">
            <feImage href={displacementMap(box, Math.min(box.h * 0.32, 12))} x="0" y="0" width={box.w} height={box.h}
              preserveAspectRatio="none" result="map" />
            {/* Red bends a little more than blue: the colour fringe at the rim. */}
            {[1, 0.96, 0.92].map((k, i) => (
              <Fragment key={i}>
                <feDisplacementMap in="SourceGraphic" in2="map" scale={scale * k} xChannelSelector="R" yChannelSelector="B" result={`d${i}`} />
                <feColorMatrix in={`d${i}`} type="matrix" values={channel(i)} result={`c${i}`} />
              </Fragment>
            ))}
            <feBlend in="c0" in2="c1" mode="screen" result="rg" />
            <feBlend in="rg" in2="c2" mode="screen" />
          </filter>
        </svg>
      )}
    </>
  );
}
