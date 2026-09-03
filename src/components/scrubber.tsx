import { useEffect, useRef, useState } from "react";
import { PanResponder, View, type LayoutChangeEvent, type PanResponderInstance } from "react-native";

type ScrubberProps = {
  duration: number;
  position: number;
  onSeek: (seconds: number) => void;
  disabled?: boolean;
};

/**
 * Custom drag scrubber (no slider package in the project).
 * While dragging, shows a preview locally; onSeek fires once on release.
 */
export function Scrubber({ duration, position, onSeek, disabled = false }: ScrubberProps) {
  const trackWidthRef = useRef(0);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const [panResponder, setPanResponder] = useState<PanResponderInstance | null>(null);
  const usable = !disabled && duration > 0;

  // latest-props refs so the once-created PanResponder never goes stale
  const latest = useRef({ usable, duration, onSeek });
  useEffect(() => {
    latest.current = { usable, duration, onSeek };
  }, [usable, duration, onSeek]);

  // created once in an effect; all ref reads happen at event time
  useEffect(() => {
    const scrubFromX = (x: number) => {
      const width = trackWidthRef.current || 1;
      const ratio = Math.min(Math.max(x / width, 0), 1);
      return ratio * latest.current.duration;
    };
    setPanResponder(
      PanResponder.create({
        onStartShouldSetPanResponder: () => latest.current.usable,
        onMoveShouldSetPanResponder: () => latest.current.usable,
        onPanResponderGrant: (e) => {
          if (!latest.current.usable) return;
          setScrubValue(scrubFromX(e.nativeEvent.locationX));
        },
        onPanResponderMove: (e) => {
          if (!latest.current.usable) return;
          setScrubValue(scrubFromX(e.nativeEvent.locationX));
        },
        onPanResponderRelease: () => {
          if (!latest.current.usable) return;
          setScrubValue((current) => {
            if (current !== null) latest.current.onSeek(current);
            return null;
          });
        },
        onPanResponderTerminate: () => setScrubValue(null),
      }),
    );
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    trackWidthRef.current = e.nativeEvent.layout.width;
  };

  const effectiveValue = scrubValue ?? position;
  const pct = usable ? Math.min(100, (effectiveValue / duration) * 100) : 0;
  const a11yStep = Math.max(10, Math.round(duration / 20));

  return (
    <View
      {...(panResponder?.panHandlers ?? {})}
      onLayout={onLayout}
      accessibilityRole="adjustable"
      accessibilityLabel="Seek"
      accessibilityValue={{ min: 0, max: Math.floor(duration), now: Math.floor(effectiveValue) }}
      accessibilityActions={usable ? [{ name: "increment" }, { name: "decrement" }] : undefined}
      onAccessibilityAction={(e) => {
        if (!usable) return;
        const delta = e.nativeEvent.actionName === "increment" ? a11yStep : -a11yStep;
        onSeek(Math.min(Math.max(position + delta, 0), duration));
      }}
      className="h-10 w-full justify-center"
    >
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-sand-200 dark:bg-ink-800">
        <View
          pointerEvents="none"
          style={{ width: `${pct}%` }}
          className={usable ? "h-1.5 rounded-full bg-forest-600 dark:bg-forest-500" : "h-1.5 rounded-full bg-sand-300 dark:bg-ink-700"}
        />
      </View>
      {usable ? (
        <View
          pointerEvents="none"
          style={{ left: `${pct}%` }}
          className="absolute top-1/2 h-5 w-5 -translate-x-2.5 -translate-y-2.5 rounded-full border-2 border-forest-600 bg-white dark:border-forest-500 dark:bg-ink-100"
        />
      ) : null}
    </View>
  );
}
