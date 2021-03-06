import { ZSet } from './zset.ts';
import { range, isEmpty, addSeconds, sleep, maxDate } from './helpers.ts';

interface RedisMockOptions {
  data: Data;
}

type Data = {
  [key: string]: RedisValue;
};

type RedisHash = { [field: string]: string; };
type NIL = undefined;
type RedisValue = string | Set<string> | Array<string> | RedisHash | ZSet;

const NIL: NIL = undefined;

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

  get(key: string): Promise<string | NIL> {
    const s = this.data.get(key);
    if (isString(s)) {
      return Promise.resolve(s);
    }
    return Promise.resolve(NIL);
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

  spop(key: string): Promise<string | NIL>;
  spop(key: string, count: number): Promise<string[]>;
  spop(key: string, count?: number): Promise<(string | NIL) | string[]> {
    if (!isSet(this.data.get(key))) {
      return Promise.resolve(count == null ? NIL : []);
    }
    const popped = count == null ? this.spopSync(key) : this.spopSyncWithCount(key, count);
    return Promise.resolve(popped);
  }

  lindex(key: string, index: number): Promise<string | NIL> {
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

  lpush(key: string, ...values: string[]): Promise<number> {
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

  async blpop(key: string | string[], timeout: number): Promise<string[]> {
    return bpop<string, string[]>({
      data: this.data,
      keyOrKeys: key,
      timeout,
      pop: key => this.lpopSync(key)!,
      shouldUnblock: element => element != NIL,
      makeReply: (key, element) => [key, element]
    });
  }

  async lpop(key: string): Promise<string | NIL> {
    return this.lpopSync(key);
  }

  rpop(key: string): Promise<string | NIL> {
    return Promise.resolve(this.rpopSync(key));
  }

  rpoplpush(source: string, destination: string): Promise<string | NIL> {
    if (!this.data.has(source)) {
      return Promise.resolve(NIL);
    }
    const toPush = this.rpopSync(source)!;
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

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.data.has(key)) {
      return [];
    }

    return this.withListAt(key, list => range(list, start, stop));
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

  async hget(key: string, field: string): Promise<string | NIL> {
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
      }, [] as string[]);
    });
  }

  async hmget(key: string, ...fields: string[]): Promise<(string | NIL)[]> {
    if (!this.data.has(key)) {
      return fields.map(() => NIL);
    }

    return this.withHashAt(key, hash => {
      return fields.map(field => hash[field]);
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

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.hsetSync(key, field, value);
  }

  async hsetnx(key: string, field: string, value: string): Promise<number> {
    return this.withHashAt(key, hash => {
      if (field in hash) {
        return 0;
      }
      hash[field] = value;
      return 1;
    });
  }

  async hmset(key: string, ...fields: string[]): Promise<string> {
    this.hsetSync(key, ...fields);
    return 'OK';
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

  async hstrlen(key: string, field: string): Promise<number> {
    if (!this.data.has(key)) {
      return 0;
    }

    return this.withHashAt(key, hash => {
      const value = hash[field] || '';
      return value.length;
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

  async hvals(key: string): Promise<string[]> {
    if (!this.data.has(key)) {
      return [];
    }

    return this.withHashAt(key, hash => {
      return Object.values(hash);
    });
  }

  zadd(
    key: string,
    score: number,
    member: string,
    opts?: {
      nxx?: "NX" | "XX";
      ch?: boolean;
      incr?: boolean;
    }
  ): Promise<number>;
  zadd(
    key: string,
    scoreMembers: (number | string)[],
    opts?: {
      nxx?: "NX" | "XX";
      ch?: boolean;
      incr?: boolean;
    }
  ): Promise<number>;
  async zadd(key: string, scoreOrScoreMembers: number | (number | string)[], memberOrOpts?: string | { nxx?: "NX" | "XX", ch?: boolean, incr?: boolean }, opts?: { nxx?: "NX" | "XX", ch?: boolean, incr?: boolean }): Promise<number> {
    return this.withZSetAt(key, zset => {
       if (typeof scoreOrScoreMembers === 'number') {
         const score = scoreOrScoreMembers;
         const member = memberOrOpts as string;
         zset.add(score, member);
       }
       return Infinity;
    });
  }

  async zcard(key: string): Promise<number> {
    if (!this.data.has(key)) {
      return 0;
    }

    return this.withZSetAt(key, zset => zset.card());
  }

  async zscore(key: string, member: string): Promise<string | NIL> {
    if (!this.data.has(key)) {
      return NIL;
    }

    return this.withZSetAt(key, zset => {
      const score = zset.score(member);
      return score === NIL ? NIL : String(score);
    });
  }

  async zrank(key: string, member: string): Promise<number | undefined> {
    if (!this.data.has(key)) {
      return NIL;
    }

    return this.withZSetAt(key, zset => zset.rank(member));
  }


  async zrevrank(key: string, member: string): Promise<number | undefined> {
    if (!this.data.has(key)) {
      return NIL;
    }

    return this.withZSetAt(key, zset => zset.revrank(member));
  }

  async zcount(key: string, min: number, max: number): Promise<number> {
    if (!this.data.has(key)) {
      return 0;
    }

    return this.withZSetAt(key, zset => zset.count(min, max));
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    opts?: {
      withScore?: boolean;
    }
  ): Promise<string[]> {
    if (!this.data.has(key)) {
      return [];
    }

    const { withScore = false } = opts || {};

    return this.withZSetAt(key, zset => {
      if (withScore) {
        return zset.rangeWithScores(start, stop);
      } else {
        return zset.range(start, stop);
      }
    });
  }

  async zrevrange(
    key: string,
    start: number,
    stop: number,
    opts?: {
      withScore?: boolean;
    }
  ): Promise<string[]> {
    if (!this.data.has(key)) {
      return [];
    }

    const { withScore = false } = opts || {};

    return this.withZSetAt(key, zset => {
      if (withScore) {
        return zset.revrangeWithScores(start, stop);
      } else {
        return zset.revrange(start, stop);
      }
    });
  }

  async zrangebyscore(
    key: string,
    min: number,
    max: number,
    opts?: {
      withScore?: boolean;
      offset?: number;
      count?: number;
    }
  ): Promise<string[]> {
    if (!this.data.has(key)) {
      return [];
    }

    const { withScore = false } = opts || {};

    return this.withZSetAt(key, zset => {
      if (withScore) {
        return zset.rangebyscoreWithScores(min, max, opts);
      } else {
        return zset.rangebyscore(min, max, opts);
      }
    });
  }

  async zrevrangebyscore(
    key: string,
    max: number,
    min: number,
    opts?: {
      withScore?: boolean;
      offset?: number;
      count?: number;
    }
  ): Promise<string[]> {
    if (!this.data.has(key)) {
      return [];
    }

    const { withScore = false } = opts || {};

    return this.withZSetAt(key, zset => {
      if (withScore) {
        return zset.revrangebyscoreWithScores(max, min, opts);
      } else {
        return zset.revrangebyscore(max, min, opts);
      }
    });
  }

  async zincrby(key: string, increment: number, member: string): Promise<string> {
    return this.withZSetAt(key, zset => {
      const newScore = zset.incrby(increment, member);
      return String(newScore);
    });
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    return this.withZSetAt(key, zset => {
      const numberOfRemovedMembers = zset.rem(...members);

      if (zset.isEmpty()) {
        this.data.delete(key);
      }

      return numberOfRemovedMembers;
    });
  }

  async bzpopmax(key: string | string[], timeout: number): Promise<string[]> {
    return this.bzpop('popmax', key, timeout);
  }

  bzpopmin(key: string | string[], timeout: number): Promise<string[]> {
    return this.bzpop('popmin', key, timeout);
  }

  async zpopmax(key: string, count?: number): Promise<string[]> {
    if (!this.data.has(key)) {
      return [];
    }

    return this.withZSetAt(key, zset => {
      const reply = zset.popmax(count);
      if (zset.isEmpty()) {
        this.data.delete(key);
      }
      return reply;
    });
  }

  async zpopmin(key: string, count?: number): Promise<string[]> {
    if (!this.data.has(key)) {
      return [];
    }

    return this.withZSetAt(key, zset => {
      const reply = zset.popmin(count);
      if (zset.isEmpty()) {
        this.data.delete(key);
      }
      return reply;
    });
  }

  async zremrangebyrank(key: string, start: number, stop: number): Promise<number> {
    return this.withZSetAt(key, zset => {
      const numRemoved = zset.remrangebyrank(start, stop);
      if (zset.isEmpty()) {
        this.data.delete(key);
      }
      return numRemoved;
    });
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    if (!this.data.has(key)) {
      return 0;
    }

    return this.withZSetAt(key, zset => {
      const numRemoved = zset.remrangebyscore(min, max);
      if (zset.isEmpty()) {
        this.data.delete(key);
      }
      return numRemoved;
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

  private withZSetAt<T>(key: string, proc: (zset: ZSet) => T): T {
    const maybeZSet = this.data.get(key);
    if (isZSet(maybeZSet)) {
      return proc(maybeZSet);
    } else if (maybeZSet == null) {
      const zset = new ZSet();
      this.data.set(key, zset);
      return proc(zset);
    } else {
      throw new WrongTypeOperationError("Invalid type");
    }
  }

  private lpopSync(key: string): string | NIL {
    if (!this.data.has(key)) {
      return NIL;
    }
    return this.withListAt(key, list => {
      const element = list.shift();
      if (list.length === 0) {
        this.data.delete(key);
      }
      return element;
    });
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

  private rpopSync(key: string): string | NIL {
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

  private lpushSync(key: string, ...values: string[]): number {
    return this.withListAt(key, list => {
      list.splice(0, 0, ...values.reverse());
      return list.length;
    });
  }

  private hsetSync(key: string, ...fields: string[]): number {
    if (isOdd(fields.length)) {
      throw new WrongNumberOfArgumentsError();
    }

    return this.withHashAt(key, hash => {
      for (let i = 0; i < fields.length; i += 2) {
        const field = fields[i];
        const value = fields[i + 1];
        hash[field] = value;
      }
      return fields.length / 2;
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

  private async bzpop(command: 'popmin' | 'popmax', key: string | string[], timeout: number): Promise<string[]> {
    return bpop<string[], string[]>({
      data: this.data,
      keyOrKeys: key,
      timeout,
      pop: key => this.withZSetAt(key, zset => zset[command](1)),
      shouldUnblock: popped => !isEmpty(popped),
      makeReply: (key, popped) => [key, ...popped]
    });
  }
}

export class WrongTypeOperationError extends Error {}
export class IndexOutOfRangeError extends Error {}
export class ValueIsNotIntegerError extends Error {}
export class ValueIsNotValidFloatError extends Error {}
export class WrongNumberOfArgumentsError extends Error {}

function isOdd(x: number): boolean {
  return x % 2 !== 0;
}

function isList(v: RedisValue): v is Array<string> {
  return Array.isArray(v);
}

function isString(v?: RedisValue): v is string {
  return typeof v === 'string';
}

function isSet(v?: RedisValue): v is Set<string> {
  return v instanceof Set;
}

function isZSet(v?: RedisValue): v is ZSet {
  return v instanceof ZSet;
}

function isHash(v?: RedisValue): v is RedisHash {
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

interface BPopOptions<TPopped, TReply extends unknown[]> {
  data: Map<string, RedisValue>;
  keyOrKeys: string | string[];
  timeout: number;
  pop: (key: string) => TPopped;
  shouldUnblock: (popped: TPopped) => boolean;
  makeReply: (key: string, popped: TPopped) => TReply;
}

function bpop<TPopped, TReply extends any[]>(options: BPopOptions<TPopped, TReply>): Promise<TReply> {
  const {
    keyOrKeys,
    timeout,
    data,
    pop,
    shouldUnblock,
    makeReply,
  } = options;
  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
  const blockedUntil = timeout === 0
    ? maxDate()
    : addSeconds(new Date(), timeout);
  const interval = 16;

  const loop = async (): Promise<TReply> => {
    for (const key of keys) {
      if (!data.has(key)) {
        continue;
      }

      const popped = pop(key);
      if (!shouldUnblock(popped)) {
        continue;
      }

      return makeReply(key, popped);
    }

    if (new Date() >= blockedUntil) {
      return ([] as any[]) as TReply;
    }

    await sleep(interval);

    return loop();
  };

  return loop();
}
