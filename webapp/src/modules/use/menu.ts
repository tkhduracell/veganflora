import { Menu, Meal, WeekDay } from '../../components/types'
import { ref, onMounted } from 'vue'

import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'

const dayTemplate = {
  [Meal.breakfast]: [],
  [Meal.lunch]: [],
  [Meal.dinner]: []
}
const template = {
  'Vecka 1': {
    days: {
      [WeekDay.monday]: { name: WeekDay.monday, ...dayTemplate },
      [WeekDay.tuesday]: { name: WeekDay.tuesday, ...dayTemplate },
      [WeekDay.wednesday]: { name: WeekDay.wednesday, ...dayTemplate },
      [WeekDay.thursday]: { name: WeekDay.thursday, ...dayTemplate },
      [WeekDay.friday]: { name: WeekDay.friday, ...dayTemplate },
      [WeekDay.saturday]: { name: WeekDay.saturday, ...dayTemplate },
      [WeekDay.sunday]: { name: WeekDay.sunday, ...dayTemplate }
    }
  }
} as Menu

async function set (menu: Menu) {
  const store = getFirestore()
  const root = doc(store, 'veganflora', 'root', 'menus', 'root')
  return setDoc(root, menu)
}

async function get (): Promise<Menu | undefined> {
  const store = getFirestore()
  const root = doc(store, 'veganflora', 'root', 'menus', 'root')

  const result = await getDoc(root)
  return result && result.exists()
    ? result.data() as Menu
    : undefined
}

function clone<T> (t: T): T {
  return JSON.parse(JSON.stringify(t))
}

export function useMenu () {
  const menu = ref<Menu>({})

  onMounted(async () => {
    const saved = await get()

    if (saved) {
      menu.value = saved
    } else {
      await set(template)
      menu.value = template
    }
  })

  function addMenuItem (week: string, key: string, weekday: WeekDay, meal: Meal) {
    const cloned = clone(menu.value)

    const d = cloned[week].days[weekday]
    d[meal] = (d[meal] || []).concat(key)
    menu.value = cloned

    set(cloned)
  }

  function removeMenuItem (week: string, key: string, weekday: WeekDay, meal: Meal) {
    const cloned = clone(menu.value)

    const d = cloned[week].days[weekday]
    d[meal] = (d[meal] || []).filter(k => k !== key)
    menu.value = cloned

    set(cloned)
  }

  return {
    menu,
    addMenuItem,
    removeMenuItem
  }
}
