import { randomBytes } from 'node:crypto'
import { Redis } from '@upstash/redis'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type {
  FoodItem,
  HouseholdMutation,
  HouseholdState,
  ShoppingItem,
} from '../src/domain'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const KEY_PREFIX = 'kylkollen:household:'

const MUTATE_SCRIPT = `
local raw = redis.call("GET", KEYS[1])
if not raw then
  return nil
end

local state = cjson.decode(raw)
local mutation = cjson.decode(ARGV[1])

if mutation.type == "add_food" then
  table.insert(state.food, mutation.item)
elseif mutation.type == "consume_food" then
  for index, item in ipairs(state.food) do
    if tonumber(item.id) == tonumber(mutation.id) then
      item.quantity = tonumber(item.quantity) - tonumber(mutation.quantity)
      if item.quantity <= 0 then
        table.remove(state.food, index)
      end
      break
    end
  end
elseif mutation.type == "remove_food" then
  for index, item in ipairs(state.food) do
    if tonumber(item.id) == tonumber(mutation.id) then
      table.remove(state.food, index)
      break
    end
  end
elseif mutation.type == "add_shopping" then
  table.insert(state.shopping, mutation.item)
elseif mutation.type == "toggle_shopping" then
  for _, item in ipairs(state.shopping) do
    if tonumber(item.id) == tonumber(mutation.id) then
      item.checked = not item.checked
      break
    end
  end
elseif mutation.type == "remove_shopping" then
  for index, item in ipairs(state.shopping) do
    if tonumber(item.id) == tonumber(mutation.id) then
      table.remove(state.shopping, index)
      break
    end
  end
else
  return redis.error_reply("Unsupported mutation")
end

state.updatedAt = ARGV[2]
local updated = cjson.encode(state)
redis.call("SET", KEYS[1], updated)
return updated
`

function getRedis() {
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null
  return new Redis({ url, token })
}

function normalizeCode(value: unknown) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10)
}

function createCode() {
  const bytes = randomBytes(10)
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length])
    .join('')
    .slice(0, 10)
}

function isFoodArray(value: unknown): value is FoodItem[] {
  return Array.isArray(value)
}

function isShoppingArray(value: unknown): value is ShoppingItem[] {
  return Array.isArray(value)
}

function isMutation(value: unknown): value is HouseholdMutation {
  if (!value || typeof value !== 'object' || !('type' in value)) return false
  return [
    'add_food',
    'consume_food',
    'remove_food',
    'add_shopping',
    'toggle_shopping',
    'remove_shopping',
  ].includes(String(value.type))
}

function sendError(
  response: VercelResponse,
  status: number,
  error: string,
) {
  return response.status(status).json({ error })
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  response.setHeader('Cache-Control', 'no-store')

  const redis = getRedis()
  if (!redis) {
    return sendError(
      response,
      503,
      'Redis är inte konfigurerat. Lägg till Upstash-miljövariabler i Vercel.',
    )
  }

  if (request.method === 'GET') {
    const code = normalizeCode(request.query.code)
    if (code.length !== 10) {
      return sendError(response, 400, 'Ange en giltig hushållskod.')
    }

    const state = await redis.get<HouseholdState>(`${KEY_PREFIX}${code}`)
    if (!state) return sendError(response, 404, 'Hushållet hittades inte.')
    return response.status(200).json({ code, state })
  }

  if (request.method === 'POST') {
    const householdName = String(request.body?.householdName ?? '').trim()
    const food = request.body?.food
    const shopping = request.body?.shopping
    if (!householdName || !isFoodArray(food) || !isShoppingArray(shopping)) {
      return sendError(response, 400, 'Hushållsdata saknas eller är ogiltig.')
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = createCode()
      const state: HouseholdState = {
        householdName: householdName.slice(0, 60),
        food,
        shopping,
        updatedAt: new Date().toISOString(),
      }
      const created = await redis.set(`${KEY_PREFIX}${code}`, state, { nx: true })
      if (created) return response.status(201).json({ code, state })
    }

    return sendError(response, 503, 'Kunde inte skapa en unik hushållskod.')
  }

  if (request.method === 'PATCH') {
    const code = normalizeCode(request.body?.code)
    const mutation = request.body?.mutation
    if (code.length !== 10 || !isMutation(mutation)) {
      return sendError(response, 400, 'Ogiltig hushållskod eller ändring.')
    }

    const updated = await redis.eval(
      MUTATE_SCRIPT,
      [`${KEY_PREFIX}${code}`],
      [JSON.stringify(mutation), new Date().toISOString()],
    ) as string | HouseholdState | null
    if (!updated) return sendError(response, 404, 'Hushållet hittades inte.')

    const state =
      typeof updated === 'string'
        ? (JSON.parse(updated) as HouseholdState)
        : (updated as HouseholdState)
    return response.status(200).json({ code, state })
  }

  response.setHeader('Allow', 'GET, POST, PATCH')
  return sendError(response, 405, 'Metoden stöds inte.')
}
