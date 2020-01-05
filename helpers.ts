export function range<T>(values: T[], start: number, stop: number) {
  const from = start < 0 ? values.length + start : start;
  const to = stop < 0 ? values.length + stop : stop;
  return values.slice(from, to + 1);
}

export function take<T>(values: T[], n: number): T[] {
  return values.slice(0, n);
}

export function isEmpty<T>(values: T[]): boolean {
  return values.length === 0;
}

export function addSeconds(date: Date, seconds: number): Date {
  const time = date.getTime();
  const milliseconds = seconds * 1000;
  return new Date(time + milliseconds);
}

export function sleep(milliseconds: number): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

export function maxDate(): Date {
  return new Date(8640000000000000);
}

