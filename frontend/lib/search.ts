// Escape ilike wildcards so "%" and "_" in the search are matched literally
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}
