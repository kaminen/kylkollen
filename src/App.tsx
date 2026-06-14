import type { IScannerControls } from '@zxing/browser'
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type StorageLocation = 'Kyl' | 'Frys' | 'Skafferi'
type View = 'home' | 'inventory' | 'shopping'

type FoodItem = {
  id: number
  ean?: string
  name: string
  quantity: number
  unit: string
  location: StorageLocation
  expiresAt: string
  emoji: string
}

type ShoppingItem = {
  id: number
  name: string
  checked: boolean
}

const initialFood: FoodItem[] = [
  {
    id: 1,
    name: 'Mjölk',
    quantity: 1,
    unit: 'paket',
    location: 'Kyl',
    expiresAt: dateFromNow(1),
    emoji: '🥛',
  },
  {
    id: 2,
    name: 'Bearnaisesås',
    quantity: 5,
    unit: 'burkar',
    location: 'Kyl',
    expiresAt: dateFromNow(37),
    emoji: '🫙',
  },
  {
    id: 3,
    name: 'Babyspenat',
    quantity: 1,
    unit: 'påse',
    location: 'Kyl',
    expiresAt: dateFromNow(0),
    emoji: '🥬',
  },
  {
    id: 4,
    name: 'Köttfärs',
    quantity: 2,
    unit: 'paket',
    location: 'Frys',
    expiresAt: dateFromNow(83),
    emoji: '🥩',
  },
  {
    id: 5,
    name: 'Pasta',
    quantity: 3,
    unit: 'paket',
    location: 'Skafferi',
    expiresAt: dateFromNow(214),
    emoji: '🍝',
  },
  {
    id: 6,
    name: 'Ägg',
    quantity: 8,
    unit: 'st',
    location: 'Kyl',
    expiresAt: dateFromNow(6),
    emoji: '🥚',
  },
]

const initialShopping: ShoppingItem[] = [
  { id: 1, name: 'Tomater', checked: false },
  { id: 2, name: 'Havregryn', checked: false },
]

const locationEmoji: Record<StorageLocation, string> = {
  Kyl: '❄️',
  Frys: '🧊',
  Skafferi: '🏠',
}

const foodEmoji: Record<string, string> = {
  mjölk: '🥛',
  ägg: '🥚',
  ost: '🧀',
  yoghurt: '🥣',
  kött: '🥩',
  kyckling: '🍗',
  fisk: '🐟',
  pasta: '🍝',
  ris: '🍚',
  bröd: '🍞',
  tomat: '🍅',
  spenat: '🥬',
  sallad: '🥬',
  banan: '🍌',
  äpple: '🍎',
}

function dateFromNow(days: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function daysUntil(dateString: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(`${dateString}T00:00:00`)
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000)
}

function expiryLabel(dateString: string) {
  const days = daysUntil(dateString)
  if (days < 0) return `Gick ut för ${Math.abs(days)} dagar sedan`
  if (days === 0) return 'Går ut idag'
  if (days === 1) return 'Går ut imorgon'
  if (days <= 7) return `${days} dagar kvar`
  return new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${dateString}T00:00:00`))
}

function getFoodEmoji(name: string) {
  const normalized = name.toLocaleLowerCase('sv')
  const match = Object.entries(foodEmoji).find(([key]) => normalized.includes(key))
  return match?.[1] ?? '🥫'
}

function todayLabel() {
  const label = new Intl.DateTimeFormat('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  return label.charAt(0).toLocaleUpperCase('sv') + label.slice(1)
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

function App() {
  const [view, setView] = useState<View>('home')
  const [food, setFood] = useState<FoodItem[]>(() =>
    readStored('kylkollen-food', initialFood),
  )
  const [shopping, setShopping] = useState<ShoppingItem[]>(() =>
    readStored('kylkollen-shopping', initialShopping),
  )
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState<
    StorageLocation | 'Alla'
  >('Alla')
  const [showAddFood, setShowAddFood] = useState(false)
  const [shoppingInput, setShoppingInput] = useState('')
  const [shoppingWarning, setShoppingWarning] = useState('')

  const expiringFood = useMemo(
    () =>
      [...food]
        .filter((item) => daysUntil(item.expiresAt) <= 7)
        .sort(
          (a, b) =>
            new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
        ),
    [food],
  )

  const filteredFood = useMemo(() => {
    const normalizedSearch = search.toLocaleLowerCase('sv')
    return food
      .filter(
        (item) =>
          locationFilter === 'Alla' || item.location === locationFilter,
      )
      .filter((item) =>
        item.name.toLocaleLowerCase('sv').includes(normalizedSearch),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
  }, [food, locationFilter, search])

  function saveFood(nextFood: FoodItem[]) {
    setFood(nextFood)
    localStorage.setItem('kylkollen-food', JSON.stringify(nextFood))
  }

  function saveShopping(nextShopping: ShoppingItem[]) {
    setShopping(nextShopping)
    localStorage.setItem('kylkollen-shopping', JSON.stringify(nextShopping))
  }

  function addShoppingItem(event: React.FormEvent) {
    event.preventDefault()
    const name = shoppingInput.trim()
    if (!name) return

    const existing = food.filter((item) =>
      item.name
        .toLocaleLowerCase('sv')
        .includes(name.toLocaleLowerCase('sv')),
    )

    if (existing.length > 0) {
      const quantity = existing.reduce((sum, item) => sum + item.quantity, 0)
      const units = existing[0].unit
      setShoppingWarning(
        `Kolla kylen först – ni har redan ${quantity} ${units} ${existing[0].name.toLocaleLowerCase('sv')} hemma.`,
      )
      return
    }

    saveShopping([
      ...shopping,
      { id: Date.now(), name, checked: false },
    ])
    setShoppingInput('')
    setShoppingWarning('')
  }

  function addFoodItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    if (!name) return

    const nextItem: FoodItem = {
      id: Date.now(),
      ean: String(form.get('ean') ?? '').trim() || undefined,
      name,
      quantity: Number(form.get('quantity')) || 1,
      unit: String(form.get('unit') ?? 'st'),
      location: String(form.get('location')) as StorageLocation,
      expiresAt: String(form.get('expiresAt')),
      emoji: getFoodEmoji(name),
    }

    saveFood([...food, nextItem])
    setShowAddFood(false)
    setView('inventory')
  }

  function useOne(item: FoodItem) {
    const nextFood =
      item.quantity <= 1
        ? food.filter((foodItem) => foodItem.id !== item.id)
        : food.map((foodItem) =>
            foodItem.id === item.id
              ? { ...foodItem, quantity: foodItem.quantity - 1 }
              : foodItem,
          )
    saveFood(nextFood)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={() => setView('home')}
          aria-label="Till startsidan"
        >
          <span className="brand-mark">K</span>
          <span>
            <strong>Kylkollen</strong>
            <small>Familjen hemma</small>
          </span>
        </button>
        <button className="avatar" type="button" aria-label="Öppna profil">
          FK
        </button>
      </header>

      <main>
        {view === 'home' && (
          <HomeView
            food={food}
            expiringFood={expiringFood}
            shoppingCount={shopping.filter((item) => !item.checked).length}
            onShowInventory={() => setView('inventory')}
            onShowShopping={() => setView('shopping')}
            onAddFood={() => setShowAddFood(true)}
            onUseOne={useOne}
          />
        )}

        {view === 'inventory' && (
          <InventoryView
            food={filteredFood}
            allFood={food}
            search={search}
            locationFilter={locationFilter}
            onSearch={setSearch}
            onFilter={setLocationFilter}
            onAddFood={() => setShowAddFood(true)}
            onUseOne={useOne}
          />
        )}

        {view === 'shopping' && (
          <ShoppingView
            shopping={shopping}
            input={shoppingInput}
            warning={shoppingWarning}
            onInput={(value) => {
              setShoppingInput(value)
              setShoppingWarning('')
            }}
            onSubmit={addShoppingItem}
            onAddAnyway={() => {
              const name = shoppingInput.trim()
              if (!name) return
              saveShopping([
                ...shopping,
                { id: Date.now(), name, checked: false },
              ])
              setShoppingInput('')
              setShoppingWarning('')
            }}
            onToggle={(id) =>
              saveShopping(
                shopping.map((item) =>
                  item.id === id ? { ...item, checked: !item.checked } : item,
                ),
              )
            }
            onRemove={(id) =>
              saveShopping(shopping.filter((item) => item.id !== id))
            }
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Huvudmeny">
        <NavButton
          active={view === 'home'}
          icon="⌂"
          label="Hem"
          onClick={() => setView('home')}
        />
        <NavButton
          active={view === 'inventory'}
          icon="▤"
          label="Matvaror"
          onClick={() => setView('inventory')}
        />
        <button
          className="add-button"
          type="button"
          onClick={() => setShowAddFood(true)}
          aria-label="Lägg till matvara"
        >
          +
        </button>
        <NavButton
          active={view === 'shopping'}
          icon="✓"
          label="Handla"
          onClick={() => setView('shopping')}
        />
        <NavButton
          active={false}
          icon="⋯"
          label="Mer"
          onClick={() => undefined}
        />
      </nav>

      {showAddFood && (
        <AddFoodDialog
          onSubmit={addFoodItem}
          onClose={() => setShowAddFood(false)}
        />
      )}
    </div>
  )
}

function HomeView({
  food,
  expiringFood,
  shoppingCount,
  onShowInventory,
  onShowShopping,
  onAddFood,
  onUseOne,
}: {
  food: FoodItem[]
  expiringFood: FoodItem[]
  shoppingCount: number
  onShowInventory: () => void
  onShowShopping: () => void
  onAddFood: () => void
  onUseOne: (item: FoodItem) => void
}) {
  return (
    <>
      <section className="welcome">
        <p className="eyebrow">{todayLabel()}</p>
        <h1>Hej familjen!</h1>
        <p>Här är läget i ert kök just nu.</p>
      </section>

      <section className="overview-grid" aria-label="Översikt">
        <button className="overview-card food-card" onClick={onShowInventory}>
          <span className="card-icon">🥦</span>
          <span>
            <strong>{food.reduce((sum, item) => sum + item.quantity, 0)}</strong>
            <small>varor hemma</small>
          </span>
          <span className="arrow">›</span>
        </button>
        <button className="overview-card alert-card" onClick={onShowInventory}>
          <span className="card-icon">⏱</span>
          <span>
            <strong>{expiringFood.length}</strong>
            <small>går ut snart</small>
          </span>
          <span className="arrow">›</span>
        </button>
        <button className="overview-card list-card" onClick={onShowShopping}>
          <span className="card-icon">🛒</span>
          <span>
            <strong>{shoppingCount}</strong>
            <small>att handla</small>
          </span>
          <span className="arrow">›</span>
        </button>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow warning-text">Ät först</p>
            <h2>Snart bäst före</h2>
          </div>
          <button className="text-button" type="button" onClick={onShowInventory}>
            Visa alla
          </button>
        </div>
        <div className="expiry-list">
          {expiringFood.slice(0, 3).map((item) => (
            <FoodRow key={item.id} item={item} onUseOne={onUseOne} />
          ))}
          {expiringFood.length === 0 && (
            <div className="empty-state">
              <span>✓</span>
              <p>Inget går ut den närmaste veckan.</p>
            </div>
          )}
        </div>
      </section>

      <section className="tip-card">
        <span className="tip-icon">💡</span>
        <div>
          <strong>Svinnsmart tips</strong>
          <p>Babyspenaten går ut idag. Perfekt i en omelett till lunch.</p>
        </div>
      </section>

      <button className="wide-add-button" type="button" onClick={onAddFood}>
        <span>+</span> Lägg till matvara
      </button>
    </>
  )
}

function InventoryView({
  food,
  allFood,
  search,
  locationFilter,
  onSearch,
  onFilter,
  onAddFood,
  onUseOne,
}: {
  food: FoodItem[]
  allFood: FoodItem[]
  search: string
  locationFilter: StorageLocation | 'Alla'
  onSearch: (value: string) => void
  onFilter: (value: StorageLocation | 'Alla') => void
  onAddFood: () => void
  onUseOne: (item: FoodItem) => void
}) {
  const locations: Array<StorageLocation | 'Alla'> = [
    'Alla',
    'Kyl',
    'Frys',
    'Skafferi',
  ]

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Vårt lager</p>
          <h1>Matvaror</h1>
        </div>
        <button className="small-add-button" type="button" onClick={onAddFood}>
          + Lägg till
        </button>
      </div>

      <label className="search-field">
        <span>⌕</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Sök efter en matvara"
        />
      </label>

      <div className="filter-row">
        {locations.map((location) => (
          <button
            className={locationFilter === location ? 'active' : ''}
            type="button"
            key={location}
            onClick={() => onFilter(location)}
          >
            {location !== 'Alla' && locationEmoji[location]} {location}
            <span>
              {location === 'Alla'
                ? allFood.length
                : allFood.filter((item) => item.location === location).length}
            </span>
          </button>
        ))}
      </div>

      <div className="inventory-list">
        {food.map((item) => (
          <FoodRow key={item.id} item={item} onUseOne={onUseOne} detailed />
        ))}
        {food.length === 0 && (
          <div className="empty-state">
            <span>⌕</span>
            <p>Inga matvaror matchar din sökning.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function ShoppingView({
  shopping,
  input,
  warning,
  onInput,
  onSubmit,
  onAddAnyway,
  onToggle,
  onRemove,
}: {
  shopping: ShoppingItem[]
  input: string
  warning: string
  onInput: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
  onAddAnyway: () => void
  onToggle: (id: number) => void
  onRemove: (id: number) => void
}) {
  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Nästa inköp</p>
          <h1>Handlingslista</h1>
        </div>
      </div>

      <form className="shopping-form" onSubmit={onSubmit}>
        <input
          value={input}
          onChange={(event) => onInput(event.target.value)}
          placeholder="Vad behöver ni köpa?"
          aria-label="Lägg till på handlingslistan"
        />
        <button type="submit">Lägg till</button>
      </form>

      {warning && (
        <div className="stock-warning" role="alert">
          <span>👀</span>
          <div>
            <strong>Finns redan hemma</strong>
            <p>{warning}</p>
            <button type="button" onClick={onAddAnyway}>
              Lägg till ändå
            </button>
          </div>
        </div>
      )}

      <div className="shopping-list">
        {shopping.map((item) => (
          <div
            className={`shopping-row ${item.checked ? 'checked' : ''}`}
            key={item.id}
          >
            <button
              className="check-button"
              type="button"
              onClick={() => onToggle(item.id)}
              aria-label={`Markera ${item.name}`}
            >
              {item.checked ? '✓' : ''}
            </button>
            <span>{item.name}</span>
            <button
              className="remove-button"
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={`Ta bort ${item.name}`}
            >
              ×
            </button>
          </div>
        ))}
        {shopping.length === 0 && (
          <div className="empty-state">
            <span>✓</span>
            <p>Listan är tom. Köket verkar vara redo.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function FoodRow({
  item,
  onUseOne,
  detailed = false,
}: {
  item: FoodItem
  onUseOne: (item: FoodItem) => void
  detailed?: boolean
}) {
  const days = daysUntil(item.expiresAt)
  const urgency = days <= 1 ? 'urgent' : days <= 7 ? 'soon' : 'fine'

  return (
    <article className="food-row">
      <div className="food-emoji">{item.emoji}</div>
      <div className="food-info">
        <strong>{item.name}</strong>
        <p>
          {item.quantity} {item.unit}
          {detailed && <span> · {item.location}</span>}
        </p>
      </div>
      <div className={`expiry-badge ${urgency}`}>
        {expiryLabel(item.expiresAt)}
      </div>
      <button
        className="use-button"
        type="button"
        onClick={() => onUseOne(item)}
        title="Använd en"
        aria-label={`Använd en ${item.name}`}
      >
        −1
      </button>
    </article>
  )
}

function AddFoodDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onClose: () => void
}) {
  const [ean, setEan] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-food-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-handle" />
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Fyll på lagret</p>
            <h2 id="add-food-title">Lägg till matvara</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Stäng">
            ×
          </button>
        </div>
        <form className="food-form" onSubmit={onSubmit}>
          <div className="ean-field">
            <label>
              EAN-kod
              <input
                name="ean"
                value={ean}
                onChange={(event) =>
                  setEan(event.target.value.replace(/\D/g, '').slice(0, 14))
                }
                inputMode="numeric"
                autoComplete="off"
                placeholder="Skanna eller skriv in koden"
              />
            </label>
            <button
              className="scan-button"
              type="button"
              onClick={() => setShowScanner(true)}
            >
              <span aria-hidden="true">▥</span>
              Skanna
            </button>
          </div>
          <p className="field-help">
            EAN-koden gör att samma produkt kan kännas igen nästa gång.
          </p>
          <label>
            Namn
            <input name="name" placeholder="Till exempel mjölk" autoFocus required />
          </label>
          <div className="form-row">
            <label>
              Antal
              <input
                name="quantity"
                type="number"
                min="1"
                defaultValue="1"
                required
              />
            </label>
            <label>
              Enhet
              <select name="unit" defaultValue="st">
                <option>st</option>
                <option>paket</option>
                <option>burkar</option>
                <option>flaskor</option>
                <option>påsar</option>
              </select>
            </label>
          </div>
          <label>
            Förvaras i
            <select name="location" defaultValue="Kyl">
              <option>Kyl</option>
              <option>Frys</option>
              <option>Skafferi</option>
            </select>
          </label>
          <label>
            Bäst före
            <input
              name="expiresAt"
              type="date"
              defaultValue={dateFromNow(7)}
              required
            />
          </label>
          <button className="primary-button" type="submit">
            Lägg till i lagret
          </button>
        </form>
        {showScanner && (
          <BarcodeScanner
            onDetected={(value) => {
              setEan(value)
              setShowScanner(false)
            }}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </div>
  )
}

function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (value: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [status, setStatus] = useState('Startar kameran...')

  useEffect(() => {
    let cancelled = false

    async function startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('Kameran är inte tillgänglig i den här webbläsaren.')
        return
      }

      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
          await Promise.all([
            import('@zxing/browser'),
            import('@zxing/library'),
          ])
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
        ])
        const reader = new BrowserMultiFormatReader(hints)
        const video = videoRef.current
        if (!video || cancelled) return

        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          video,
          (result) => {
            if (cancelled || !result) return

            const value = result.getText().replace(/\D/g, '')
            if (value.length >= 8 && value.length <= 14) {
              navigator.vibrate?.(80)
              onDetected(value)
            }
          },
        )

        if (cancelled) {
          controls.stop()
          return
        }

        controlsRef.current = controls
        setStatus('Rikta kameran mot streckkoden')
      } catch {
        setStatus(
          'Kameran kunde inte öppnas. Kontrollera kamerabehörigheten och försök igen.',
        )
      }
    }

    void startScanner()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [onDetected])

  return (
    <div className="scanner-overlay" role="dialog" aria-modal="true">
      <div className="scanner-topbar">
        <div>
          <strong>Skanna EAN-kod</strong>
          <small>{status}</small>
        </div>
        <button type="button" onClick={onClose} aria-label="Stäng skannern">
          ×
        </button>
      </div>
      <div className="camera-frame">
        <video ref={videoRef} muted playsInline />
        <div className="scan-window" aria-hidden="true">
          <span />
        </div>
      </div>
      <p className="scanner-help">
        Kameran kräver HTTPS på mobilen. Lokal utveckling fungerar via
        localhost.
      </p>
    </div>
  )
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={active ? 'nav-button active' : 'nav-button'}
      type="button"
      onClick={onClick}
    >
      <span>{icon}</span>
      <small>{label}</small>
    </button>
  )
}

export default App
