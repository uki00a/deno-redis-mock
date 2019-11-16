interface RedisMockOptions {
  data: Data;
}

type Data = {
  [key: string]: RedisValue;
};

type RedisValue = (
  string |
  Set<string> |
  Array<string>
);

export class RedisMock {
  private readonly data: Data;

  constructor(options?: RedisMockOptions) {
    const {
      data = {}
    } = options || {};

    this.data = data;
  }

  get(key: string): Promise<string> {
    const s = this.data[key];
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

  sismember(key: string, member: string): Promise<number> {
    return this.withSetAt(key, set => {
      return Promise.resolve(set.has(member) ? 1 : 0);
    });
  }

  lindex(key: string, index: number): Promise<string> {
    return this.withListAt(key, list => {
      const element = index < 0
        ? list[list.length + index]
        : list[index];
      return Promise.resolve(element === undefined ? null : element);
    });
  }

  lpush(key, ...values): Promise<number> {
    return this.withListAt(key, list => {
      list.splice(0, 0, ...values.reverse());
      return Promise.resolve(list.length);
    });
  }

  lpop(key: string): Promise<string> {
    return this.withListAt(key, list => Promise.resolve(list.shift()));
  }

  llen(key: string): Promise<number> {
    return this.withListAt(key, list => Promise.resolve(list.length));
  }

  private withSetAt<T>(key: string, proc: (set: Set<string>) => T): T {
    const maybeSet = this.data[key];
    if (isSet(maybeSet)) {
      return proc(maybeSet);
    } else if (maybeSet == null) {
      const set = new Set<string>();
      this.data[key] = set;
      return proc(set);
    } else {
      throw new RedisMockError('Invalid type');
    }
  }

  private withListAt<T>(key: string, proc: (list: Array<string>) => T): T {
    const maybeList = this.data[key];
    if (Array.isArray(maybeList)) {
      return proc(maybeList);
    } else if (maybeList == null) {
      const list: Array<string> = [];
      this.data[key] = list;
      return proc(list);
    } else {
      throw new RedisMockError('Invalid type');
    }
  }
}

class RedisMockError extends Error {}

function isString(v: RedisValue): v is string {
  return typeof v === 'string';
}

function isSet(v: RedisValue): v is Set<string> {
  return v instanceof Set;
}
