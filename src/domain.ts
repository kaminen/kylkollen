export type StorageLocation = 'Kyl' | 'Frys' | 'Skafferi'

export type FoodItem = {
  id: number
  ean?: string
  name: string
  quantity: number
  unit: string
  location: StorageLocation
  expiresAt: string
  emoji: string
}

export type ShoppingItem = {
  id: number
  name: string
  checked: boolean
}

export type HouseholdState = {
  householdName: string
  food: FoodItem[]
  shopping: ShoppingItem[]
  updatedAt: string
}

export type HouseholdMutation =
  | { type: 'add_food'; item: FoodItem }
  | { type: 'consume_food'; id: number; quantity: number }
  | { type: 'remove_food'; id: number }
  | { type: 'add_shopping'; item: ShoppingItem }
  | { type: 'toggle_shopping'; id: number }
  | { type: 'remove_shopping'; id: number }
