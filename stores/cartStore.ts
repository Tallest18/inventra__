import { create } from "zustand";

export interface CartItem {
  id: string;
  quantity: number;
  product?: any;
}

interface CartState {
  cart: CartItem[];
  setCart: (cartOrFn: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  clearCart: () => void;
}

const useCartStore = create<CartState>((set) => ({
  cart: [],
  setCart: (cartOrFn) =>
    set((state) => ({
      cart: typeof cartOrFn === "function" ? cartOrFn(state.cart) : cartOrFn,
    })),
  clearCart: () => set({ cart: [] }),
}));

export default useCartStore;
