export function formatCount(n: number | null | undefined, singular: string, plural: string): string {
  const c = n ?? 0;
  return `${c} ${c === 1 ? singular : plural}`;
}
