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

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, kind = "info") => {
    const id = nextId++;
    // keep at most 3 stacked toasts
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, kind }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
