class Memo<K, V> {
  private readonly mutableResults = new Map<K, V>()

  constructor(private readonly builder: (key: K) => V) {}

  delete(key: K): void {
    this.mutableResults.delete(key)
  }

  entries(): IterableIterator<[K, V]> {
    return this.mutableResults.entries()
  }

  get(key: K): V {
    if (this.mutableResults.has(key)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- already checked
      return this.mutableResults.get(key)!
    } else {
      const value = this.builder(key)
      this.mutableResults.set(key, value)
      return value
    }
  }

  keys(): IterableIterator<K> {
    return this.mutableResults.keys()
  }

  values(): IterableIterator<V> {
    return this.mutableResults.values()
  }
}

export type { Memo }

export function memo<K, V>(builder: (key: K) => V): Memo<K, V> {
  return new Memo(builder)
}
