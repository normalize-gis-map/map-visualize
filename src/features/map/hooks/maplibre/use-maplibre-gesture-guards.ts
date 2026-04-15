import type maplibregl from "maplibre-gl";
import { useEffect } from "react";

export function useMaplibreGestureGuards(
  mapInstance: maplibregl.Map | null,
  mapPointerInsideRef: React.MutableRefObject<boolean>,
  mapPointerDownRef: React.MutableRefObject<boolean>,
) {
  useEffect(() => {
    if (!mapInstance) return;

    const container = mapInstance.getContainer();
    container.style.touchAction = "pan-x pan-y";
    container.style.overscrollBehaviorX = "contain";
    container.style.overscrollBehaviorY = "contain";

    const markPointerEnter = () => {
      mapPointerInsideRef.current = true;
    };
    const markPointerLeave = () => {
      mapPointerInsideRef.current = false;
      mapPointerDownRef.current = false;
    };
    const markPointerDown = () => {
      mapPointerDownRef.current = true;
    };
    const markPointerUp = () => {
      mapPointerDownRef.current = false;
    };

    const preventHorizontalGesture = (event: WheelEvent) => {
      if (!event.cancelable) return;
      const mapOwnsInteraction = mapPointerInsideRef.current || mapPointerDownRef.current;
      if (mapOwnsInteraction && Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.1) {
        event.preventDefault();
      }
    };

    container.addEventListener("pointerenter", markPointerEnter);
    container.addEventListener("pointerleave", markPointerLeave);
    container.addEventListener("pointerdown", markPointerDown);
    container.addEventListener("pointerup", markPointerUp);
    container.addEventListener("pointercancel", markPointerUp);
    container.addEventListener("wheel", preventHorizontalGesture, {
      passive: false,
    });

    return () => {
      container.removeEventListener("pointerenter", markPointerEnter);
      container.removeEventListener("pointerleave", markPointerLeave);
      container.removeEventListener("pointerdown", markPointerDown);
      container.removeEventListener("pointerup", markPointerUp);
      container.removeEventListener("pointercancel", markPointerUp);
      container.removeEventListener("wheel", preventHorizontalGesture);
    };
  }, [mapInstance, mapPointerDownRef, mapPointerInsideRef]);
}
