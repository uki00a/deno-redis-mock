interface RedisMockOptions {
  data: Data;
}

type Data = {
  [key: string]: RedisValue;
};

type RedisValue = string | Set<string> | Array<string>;

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

  sdiff(...keys: string[]): Promise<string[]> {
    const emptySet = new Set<string>();
    const sets = keys.map(key => this.data.has(key) ? this.data.get(key) : emptySet) as Set<string>[];

    if (!sets.every(isSet)) {
      return Promise.reject(new WrongTypeOperationError());
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
    return Promise.resolve(Array.from(diff));
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
}

export class WrongTypeOperationError extends Error {}
export class IndexOutOfRangeError extends Error {}

function isList(v: RedisValue): v is Array<string> {
  return Array.isArray(v);
}

function isString(v: RedisValue): v is string {
  return typeof v === 'string';
}

function isSet(v: RedisValue): v is Set<string> {
  return v instanceof Set;
}

function sample<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}
