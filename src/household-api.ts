import type {
  FoodItem,
  HouseholdMutation,
  HouseholdState,
  ShoppingItem,
} from './domain'

type HouseholdResponse = {
  code: string
  state: HouseholdState
}

async function requestHousehold(
  url: string,
  init?: RequestInit,
): Promise<HouseholdResponse> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const payload = (await response.json()) as
    | HouseholdResponse
    | { error?: string }

  if (!response.ok || !('state' in payload)) {
    throw new Error(
      'error' in payload && payload.error
        ? payload.error
        : 'Kunde inte ansluta till hushållet.',
    )
  }

  return payload
}

export function createHousehold(
  householdName: string,
  food: FoodItem[],
  shopping: ShoppingItem[],
) {
  return requestHousehold('/api/household', {
    method: 'POST',
    body: JSON.stringify({ householdName, food, shopping }),
  })
}

export function getHousehold(code: string) {
  return requestHousehold(
    `/api/household?code=${encodeURIComponent(code)}`,
  )
}

export function mutateHousehold(code: string, mutation: HouseholdMutation) {
  return requestHousehold('/api/household', {
    method: 'PATCH',
    body: JSON.stringify({ code, mutation }),
  })
}
