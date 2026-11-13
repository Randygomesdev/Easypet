import { createContext, useContext, useState, type ReactNode } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  cartItemId:   string
  productId:    string
  label:        string
  description?: string
  price:        number
  quantity:     number
  imageUrl?:    string
  metadata?:    Record<string, unknown>
}

interface CartContextValue {
  items:          CartItem[]
  addItem:        (item: Omit<CartItem, 'cartItemId'>) => void
  removeItem:     (cartItemId: string) => void
  updateQuantity: (cartItemId: string, qty: number) => void
  clearCart:      () => void
  itemCount:      number
  total:          number
}

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'easypet_cart'

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

function persist(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

// ── Context ───────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart)

  function commit(next: CartItem[]) {
    setItems(next)
    persist(next)
  }

  function addItem(item: Omit<CartItem, 'cartItemId'>) {
    const cartItemId = crypto.randomUUID()
    commit([...items, { ...item, cartItemId }])
  }

  function removeItem(cartItemId: string) {
    commit(items.filter(i => i.cartItemId !== cartItemId))
  }

  function updateQuantity(cartItemId: string, qty: number) {
    if (qty <= 0) { removeItem(cartItemId); return }
    commit(items.map(i => i.cartItemId === cartItemId ? { ...i, quantity: qty } : i))
  }

  function clearCart() {
    commit([])
  }

  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0)
  const total     = items.reduce((acc, i) => acc + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart deve ser usado dentro de CartProvider')
  return ctx
}
