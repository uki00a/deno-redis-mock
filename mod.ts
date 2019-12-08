interface RedisMockOptions {
  data: Data;
}

type Data = {
  [key: string]: RedisValue;
};

type RedisHash = { [field: string]: string; };
type RedisValue = string | Set<string> | Array<string> | RedisHash;

const NIL = undefined;

export function createMockRedis(options?: RedisMockOptions) {
  return new MockRedis(options);
}

class MockRedis {
  private readonly data: Map<string, RedisValue>;

  constructor(options?: RedisMockOptions) {
    const { data = {} } = options || {};

    this.data = Object.keys(data).reduce((map, key) => {
      map.set(key, data[key]);
      return map;
    }, new Map<string, RedisValue>());
  }

  del(...keys: string[]): Promise<number> {
    const uniqueKeys = [...new Set(keys)];
    const numDeleted = uniqueKeys.reduce((numDeleted, key) => {
      return this.data.has(key)
        ? numDeleted + 1
        : numDeleted;
    }, 0);

    uniqueKeys.forEach(keyToDelete => {
      this.data.delete(keyToDelete);
    });

    return Promise.resolve(numDeleted);
  }

  exists(...keys: string[]): Promise<number> {
    return Promise.resolve(keys.filter(key => this.data.has(key)).length);
  }

  get(key: string): Promise<string> {
    const s = this.data.get(key);
    if (isString(s)) {
      return Promise.resolve(s);
    }
  }

  sadd(key: string, ...members: string[]): Promise<number> {
    return this.withSetAt(key, set => {
      const previousSize = set.size;
      members.forEach(x => set.add(x));
      return Promise.resolve(set.size - previousSize);
    });
  }

  scard(key: string): Promise<number> {
    if (!this.data.has(key)) {
      return Promise.resolve(0);
    }
    return this.withSetAt(key, set => Promise.resolve(set.size));
  }

  smembers(key: string): Promise<string[]> {
    if (!this.data.has(key)) {
      return Promise.resolve([]);
    }
    return this.withSetAt(key, set => Promise.resolve(Array.from(set)));
  }

  sismember(key: string, member: string): Promise<number> {
    return this.withSetAt(key, set => {
      return Promise.resolve(set.has(member) ? 1 : 0);
    });
  }

  srem(key: string, ...members: string[]): Promise<number> {
    if (!this.data.has(key)) {
      return Promise.resolve(0);
    }
    return this.withSetAt(key, set => {
      const previousSize = set.size;

      members.forEach(x => set.delete(x));

      if (set.size === 0) {
        this.data.delete(key);
      }

      return Promise.resolve(previousSize - set.size);
    });
  }

  smove(source: string, destination: string, member: string): Promise<number> {
    if (!this.data.has(source)) {
      return Promise.resolve(0);
    }

    return this.withSetAt(source, sourceSet => {
      if (!sourceSet.has(member)) {
        return Promise.resolve(0);
      }

      return this.withSetAt(destination, destinationSet => {
        sourceSet.delete(member);
        destinationSet.add(member);

        if (sourceSet.size === 0) {
          this.data.delete(source);
        }

        return Promise.resolve(1);
      });
    });
  }

  async sdiff(...keys: string[]): Promise<string[]> {
    return this.sdiffSync(...keys);
  }

  async sdiffstore(destination: string, ...keys: string[]): Promise<number> {
    const diff = this.sdiffSync(...keys);
    const destinationSet = new Set<string>(diff);
    if (destinationSet.size > 0) {
      this.data.set(destination, destinationSet);
    }
    return destinationSet.size;
  }

  async sinter(...keys: string[]): Promise<string[]> {
    const inter = this.sinterSync(...keys);
    return Array.from(inter);
  }

  async sinterstore(destination: string, ...keys: string[]): Promise<number> {
    const inter = this.sinterSync(...keys);
    if (inter.size > 0) {
      this.data.set(destination, inter);
    }
    return inter.size;
  }

  spop(key: string): Promise<string>;
  spop(key: string, count: number): Promise<string[]>;
  spop(key: string, count?: number): Promise<string | string[]> {
    if (!isSet(this.data.get(key))) {
      return Promise.resolve(count == null ? NIL : []);
    }
    const popped = count == null ? this.spopSync(key) : this.spopSyncWithCount(key, count);
    return Promise.resolve(popped);
  }

  lindex(key: string, index: number): Promise<string> {
    return this.withListAt(key, list => {
      const element = index < 0 ? list[list.length + index] : list[index];
      return Promise.resolve(element === undefined ? NIL : element);
    });
  }

  linsert(
    key: string,
    loc: "BEFORE" | "AFTER",
    pivot: string,
    value: string
  ): Promise<number> {
    return this.withListAt(key, list => {
      const index = list.indexOf(pivot);
      if (index === -1) {
        return Promise.resolve(-1);
      }

      if (loc === 'BEFORE') {
        list.splice(index, 0, value);
      } else {
        list.splice(index + 1, 0, value);
      }

      return Promise.resolve(list.length);
    });
  }

  lpush(key, ...values): Promise<number> {
    return Promise.resolve(this.lpushSync(key, ...values));
  }

  lpushx(key: string, value: string): Promise<number> {
    if (!this.data.has(key)) {
      return Promise.resolve(0);
    }
    return this.lpush(key, value);
  }

  rpush(key: string, ...values: string[]): Promise<number> {
    return this.withListAt(key, list => {
      list.push(...values);
      return Promise.resolve(list.length);
    });
  }

  rpushx(key: string, value: string): Promise<number> {
    if (!this.data.has(key)) {
      return Promise.resolve(0);
    }
    return this.rpush(key, value);
  }

  lpop(key: string): Promise<string> {
    if (!this.data.has(key)) {
      return Promise.resolve(NIL);
    }
    return this.withListAt(key, list => {
      const element = list.shift();
      if (list.length === 0) {
        this.data.delete(key);
      }
      return Promise.resolve(element)
    });
  }

  rpop(key: string): Promise<string> {
    return Promise.resolve(this.rpopSync(key));
  }

  rpoplpush(source: string, destination: string): Promise<string> {
    if (!this.data.has(source)) {
      return Promise.resolve(NIL);
    }
    const toPush = this.rpopSync(source);
    this.lpushSync(destination, toPush);
    return Promise.resolve(toPush);
  }

  lrem(key: string, count: number, value: string): Promise<number> {
    if (!this.data.has(key)) {
      return Promise.resolve(0);
    }

    return this.withListAt(key, list => {
      const max = count === 0 ? list.length : Math.abs(count);
      const fromTail = count < 0;

      let numRemoved = 0;
      let index = list.indexOf(value);
      while (numRemoved < max && index > -1) {
        list.splice(index, 1);
        index = fromTail ? list.lastIndexOf(value) : list.indexOf(value);
        ++numRemoved;
      }

      if (list.length === 0) {
        this.data.delete(key);
      }

      return Promise.resolve(numRemoved);
    });
  }

  lset(key: string, index: number, value: string): Promise<string> {
    return this.withListAt(key, list => {
      const normalizedIndex = index < 0 ? list.length + index : index;
      if (normalizedIndex < 0 || normalizedIndex >= list.length) {
        return Promise.reject(new IndexOutOfRangeError('index out of range'));
      }
      list[normalizedIndex] = value;
      return Promise.resolve('OK');
    });
  }

  llen(key: string): Promise<number> {
    return this.withListAt(key, list => Promise.resolve(list.length));
  }

  lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.data.has(key)) {
      return Promise.resolve([]);
    }

    return this.withListAt(key, list => {
      const from = start < 0 ? list.length + start : start;
      const to = stop < 0 ? list.length + stop : stop;
      return Promise.resolve(list.slice(from, to + 1));
    });
  }

  ltrim(key: string, start: number, stop: number): Promise<string> {
    return this.withListAt(key, list => {
      const from = start < 0 ? list.length + start : start;
      const to = stop < 0 ? list.length + stop : stop;
      list.splice(0, from);
      list.length = to - from + 1;
      return Promise.resolve('OK');
    });
  }

  async hget(key: string, field: string): Promise<string> {
    const hash = this.data.get(key);
    if (isHash(hash)) {
      return hash[field];
    } else if (hash == null) {
      return NIL;
    } else {
      throw new WrongTypeOperationError();
    }
  }

  async hgetall(key: string): Promise<string[]> {
    if (!this.data.has(key)) {
      return [];
    }
    return this.withHashAt(key, hash => {
      return Object.keys(hash).reduce((reply, field) => {
        const value = hash[field];
        reply.push(field, value);
        return reply;
      }, []);
    });
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.withHashAt(key, hash => {
      const value = hash[field] || '0';
      hash[field] = this.incrementBy(value, increment);
      return Number(hash[field]);
    });
  }

  async hincrbyfloat(key: string, field: string, increment: number): Promise<string> {
    return this.withHashAt(key, hash => {
      const value = hash[field] || '0';
      hash[field] = this.incrementByFloat(value, increment);
      return hash[field];
    });
  }

  hset(key: string, field: string, value: string): Promise<number> {
    return this.withHashAt(key, hash => {
      hash[field] = value;
      return Promise.resolve(1);
    });
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.withHashAt(key, hash => {
      const origLength = Object.keys(hash).length;
      fields.forEach(field => delete hash[field]);
      const currentLength = Object.keys(hash).length;
      if (currentLength === 0) {
        this.data.delete(key);
      }
      return origLength - currentLength;
    });
  }

  hexists(key: string, field: string): Promise<number> {
    if (!this.data.has(key)) {
      return Promise.resolve(0);
    }

    return this.withHashAt(key, hash => {
      return Promise.resolve(hash[field] == null ? 0 : 1);
    });
  }

  hlen(key: string): Promise<number> {
    if (!this.data.has(key)) {
      return Promise.resolve(0);
    }

    return this.withHashAt(key, hash => {
      const keys = Object.keys(hash);
      return Promise.resolve(keys.length);
    });
  }

  async hkeys(key: string): Promise<string[]> {
    if (!this.data.has(key)) {
      return [];
    }

    return this.withHashAt(key, hash => {
      return Object.keys(hash);
    });
  }

  private withSetAt<T>(key: string, proc: (set: Set<string>) => T): T {
    const maybeSet = this.data.get(key);
    if (isSet(maybeSet)) {
      return proc(maybeSet);
    } else if (maybeSet == null) {
      const set = new Set<string>();
      this.data.set(key, set);
      return proc(set);
    } else {
      throw new WrongTypeOperationError("Invalid type");
    }
  }

  private withListAt<T>(key: string, proc: (list: Array<string>) => T): T {
    const maybeList = this.data.get(key);
    if (Array.isArray(maybeList)) {
      return proc(maybeList);
    } else if (maybeList == null) {
      const list: Array<string> = [];
      this.data.set(key, list);
      return proc(list);
    } else {
      throw new WrongTypeOperationError("Invalid type");
    }
  }

  private withHashAt<T>(key: string, proc: (hash: RedisHash) => T): T {
    const maybeHash = this.data.get(key);
    if (isHash(maybeHash)) {
      return proc(maybeHash);
    } else if (maybeHash == null) {
      const hash = {} as RedisHash;
      this.data.set(key, hash);
      return proc(hash);
    } else {
      throw new WrongTypeOperationError("Invalid type");
    }
  }

  private spopSync(key: string): string {
    return this.withSetAt(key, set => {
      const members = Array.from(set);
      const toPop = sample(members);
      set.delete(toPop);
      if (set.size === 0) {
        this.data.delete(key);
      }
      return toPop;
    });
  }

  private spopSyncWithCount(key: string, count: number): string[] {
    return this.withSetAt(key, set => {
      const toPop = Array.from(set.values()).slice(0, count);
      toPop.forEach(x => set.delete(x));
      if (set.size === 0) {
        this.data.delete(key);
      }
      return toPop;
    });
  }

  private sdiffSync(...keys: string[]): string[] {
    const emptySet = new Set<string>();
    const sets = keys.map(key => this.data.has(key) ? this.data.get(key) : emptySet) as Set<string>[];

    if (!sets.every(isSet)) {
      throw new WrongTypeOperationError();
    }

    const [first, ...rest] = sets;
    const diff = new Set<string>(first);
    for (const set of rest) {
      for (const x of set) {
        if (diff.has(x)) {
          diff.delete(x);
        }
      }
    }
    return Array.from(diff);
  }

  private sinterSync(...keys: string[]): Set<string> {
    const emptySet = new Set<string>();
    const [firstValue, ...restValues] = keys.map(key => this.data.has(key) ? this.data.get(key) : emptySet);

    if (!isSet(firstValue)) {
      throw new WrongTypeOperationError();
    }

    let result = new Set(firstValue);
    for (const maybeSet of restValues) {
      if (!isSet(maybeSet)) {
        throw new WrongTypeOperationError();
      }

      result = intersection(result, maybeSet);

      if (result.size === 0) {
        return result;
      }
    }
    return result;
  }

  private rpopSync(key: string): string {
    if (!this.data.has(key)) {
      return NIL;
    }
    return this.withListAt(key, list => {
      const element = list.pop();
      if (list.length === 0) {
        this.data.delete(key);
      }
      return element;
    });
  }

  private lpushSync(key, ...values): number {
    return this.withListAt(key, list => {
      list.splice(0, 0, ...values.reverse());
      return list.length;
    });
  }

  private incrementBy(value: string, increment: number): string {
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
      throw new ValueIsNotIntegerError();
    }
    return String(parsedValue + increment);
  }

  private incrementByFloat(value: string, increment: number): string {
    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue)) {
      throw new ValueIsNotValidFloatError();
    }
    return String(parsedValue + increment);
  }
}

export class WrongTypeOperationError extends Error {}
export class IndexOutOfRangeError extends Error {}
export class ValueIsNotIntegerError extends Error {}
export class ValueIsNotValidFloatError extends Error {}

function isList(v: RedisValue): v is Array<string> {
  return Array.isArray(v);
}

function isString(v: RedisValue): v is string {
  return typeof v === 'string';
}

function isSet(v: RedisValue): v is Set<string> {
  return v instanceof Set;
}

function isHash(v: RedisValue): v is RedisHash {
  return Object.prototype.toString.call(v) === '[object Object]';
}

function sample<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function intersection(set1: Set<string>, set2: Set<string>): Set<string> {
  const inter = new Set<string>();
  for (const x of set2) {
    if (set1.has(x)) {
      inter.add(x);
    }
  }
  return inter;
}
