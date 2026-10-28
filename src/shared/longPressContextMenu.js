const DEFAULT_SELECTOR = [
  "[data-map-token]",
  "[data-combat-turn-token-context]",
  "[data-combat-turn-status-remove]",
  "[data-combat-pgmax-restore-context]",
  "[data-diary-tag-filter]",
  "[data-master-combat-round-reset]",
  '[data-action="roll-dice-formula"][data-dice-formula]'
].join(",");

export function installLongPressContextMenu(root, options = {}) {
  if (!root?.addEventListener) return () => {};
  const selector = options.selector || DEFAULT_SELECTOR;
  const durationMs = Math.max(350, Number(options.durationMs) || 560);
  const movementTolerance = Math.max(4, Number(options.movementTolerance) || 12);
  let gesture = null;
  let suppressClickUntil = 0;

  const clearGesture = () => {
    if (gesture?.timer) clearTimeout(gesture.timer);
    gesture = null;
  };

  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" || event.button !== 0 || event.isPrimary === false) return;
    const target = event.target?.closest?.(selector);
    if (!target) return;
    clearGesture();
    gesture = {
      pointerId: event.pointerId,
      target,
      x: event.clientX,
      y: event.clientY,
      timer: setTimeout(() => {
        if (!gesture || gesture.pointerId !== event.pointerId || !target.isConnected) return;
        const MouseEventClass = target.ownerDocument?.defaultView?.MouseEvent || globalThis.MouseEvent;
        const contextEvent = new MouseEventClass("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: gesture.x,
          clientY: gesture.y,
          button: 2
        });
        target.dispatchEvent(contextEvent);
        if (contextEvent.defaultPrevented) {
          suppressClickUntil = Date.now() + 700;
          globalThis.navigator?.vibrate?.(18);
        }
        clearGesture();
      }, durationMs)
    };
  };

  const onPointerMove = (event) => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > movementTolerance) clearGesture();
  };

  const onPointerEnd = (event) => {
    if (gesture && event.pointerId === gesture.pointerId) clearGesture();
  };

  const onContextMenu = (event) => {
    if (gesture && event.isTrusted) clearGesture();
  };

  const onClick = (event) => {
    if (Date.now() >= suppressClickUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  root.addEventListener("pointerdown", onPointerDown, true);
  root.addEventListener("pointermove", onPointerMove, true);
  root.addEventListener("pointerup", onPointerEnd, true);
  root.addEventListener("pointercancel", onPointerEnd, true);
  root.addEventListener("contextmenu", onContextMenu, true);
  root.addEventListener("click", onClick, true);

  return () => {
    clearGesture();
    root.removeEventListener("pointerdown", onPointerDown, true);
    root.removeEventListener("pointermove", onPointerMove, true);
    root.removeEventListener("pointerup", onPointerEnd, true);
    root.removeEventListener("pointercancel", onPointerEnd, true);
    root.removeEventListener("contextmenu", onContextMenu, true);
    root.removeEventListener("click", onClick, true);
  };
}
