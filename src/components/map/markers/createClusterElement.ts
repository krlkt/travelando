/**
 * Builds the DOM element for a wishlist cluster marker — a neutral "+N" pill
 * shown when several wishlist pins collide at the current zoom. Clicking it
 * zooms in to expand the cluster (handled by DayMapCanvas). Like the regular
 * markers, this is an imperative MapLibre DOM node, so its motion lives on an
 * inner wrapper to keep the MapLibre-controlled root transform-free.
 */
export function createClusterElement(count: number): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'dm-marker dm-cluster';
  el.setAttribute(
    'aria-label',
    `${count} wishlist places here — zoom in to expand`,
  );
  el.title = `${count} wishlist places`;
  el.innerHTML = `<span class="dm-marker__inner"><span class="dm-cluster__pill">+${count}</span></span>`;
  return el;
}
