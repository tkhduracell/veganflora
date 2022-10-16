import { ref } from '@vue/composition-api'

export type Multi = 1 | 2 | 3 | 4 | 0.5
export function useMulti() {
  const multiplier = ref<Multi>(1)
  function plus() {
    if (multiplier.value >= 1) {
      multiplier.value = Math.min(4, Math.floor(multiplier.value + 1)) as Multi
    }
    if (multiplier.value === 0.5) {
      multiplier.value = 1
    }
  }
  function minus() {
    if (multiplier.value > 1) {
      multiplier.value = Math.floor(multiplier.value - 1) as Multi
    }
    if (multiplier.value === 1) {
      multiplier.value = 0.5
    }
  }
  function prettyMulti(amount: any, multiplier: Multi) {
    const out = amount * multiplier
    if (isNaN(out)) {
      return `${multiplier} x ${amount}`
    }
    return out
  }

  return { multiplier, minus, plus, prettyMulti }
}
