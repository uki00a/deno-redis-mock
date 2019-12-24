export function range<T>(values: T[], start: number, stop: number) {
  const from = start < 0 ? values.length + start : start;
  const to = stop < 0 ? values.length + stop : stop;
  return values.slice(from, to + 1);
}

