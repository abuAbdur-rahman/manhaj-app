import { create } from "zustand";

export type ToastKind = "info" | "warning";

export type ToastMessage = {
  id: number;
  message: string;
  kind: ToastKind;
};

interface ToastState {
  toasts: ToastMessage[];
  show: (message: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
// Auto-dismiss timers keyed by toast id, so dismiss() can cancel them.
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function clearTimer(id: number) {
  const timer = timers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, kind = "info") => {
    const id = nextId++;
    // keep at most 3 stacked toasts
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, kind }] }));
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, 3000),
    );
  },
  dismiss: (id) => {
    clearTimer(id);
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
