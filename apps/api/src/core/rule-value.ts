/** A business rule: a fixed value (tests), or a getter read at every use (the admin-editable rules, sync or async). */
export type RuleValue<T> = T | (() => T | Promise<T>);

export async function resolveRule<T>(value: RuleValue<T>): Promise<T> {
  return typeof value === 'function' ? await (value as () => T | Promise<T>)() : value;
}
