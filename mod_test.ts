import { runIfMain, test } from './vendor/https/deno.land/std/testing/mod.ts';
import { assertStrictEq, assertArrayContains, assertEquals } from './vendor/https/deno.land/std/testing/asserts.ts';
import { RedisMock } from './mod.ts';

test(async function get() {
  const redis = new RedisMock({
    data: {
      'test': 'hello'
    }
  });

  for (const tc of [
    { given: 'test', expected: 'hello' },
    { given: 'non_existing_key', expected: undefined }
  ]) {
    const { given, expected } = tc;
    const actual = await redis.get(given);
    assertStrictEq(actual, expected);
  }
});

test(async function sismember() {
  const redis = new RedisMock();

  await redis.sadd('hoge', 'hoge');
  await redis.sadd('hoge', 'piyo');

  assertStrictEq(await redis.sismember('hoge', 'hoge'), 1);
  assertStrictEq(await redis.sismember('hoge', 'piyo'), 1);
  assertStrictEq(await redis.sismember('hoge', 'fuga'), 0);

  assertStrictEq(await redis.sismember('piyo', 'hoge'), 0);
});

test(async function lindex() {
  const redis = new RedisMock();

  await redis.lpush('test-list', 'D', 'C', 'B', 'A');

  assertStrictEq(await redis.lindex('test-list', 0), 'A');
  assertStrictEq(await redis.lindex('test-list', 2), 'C');
  assertStrictEq(await redis.lindex('test-list', -1), 'D');
  assertStrictEq(await redis.lindex('test-list', -3), 'B');
  assertStrictEq(await redis.lindex('test-list', 4), null);
  assertStrictEq(await redis.lindex('test-list', -5), null);
});

test(async function lrange() {
  const redis = new RedisMock();

  await redis.rpush('mylist', 'one');
  await redis.rpush('mylist', 'two');
  await redis.rpush('mylist', 'three');

  assertEquals(await redis.lrange('mylist', 0, 0), ['one']);
  assertEquals(await redis.lrange('mylist', -3, 2), ['one', 'two', 'three']);
  assertEquals(await redis.lrange('mylist', -100, 100), ['one', 'two', 'three']);
  assertEquals(await redis.lrange('mylist', 5, 10), []);
});

test(async function lpush() {
  const redis = new RedisMock();

  assertStrictEq(await redis.lpush('test-list', 'a'), 1);
  assertStrictEq(await redis.lpush('test-list', 'b', 'c'), 3);
});

test(async function rpush() {
  {
    const redis = new RedisMock();

    assertStrictEq(await redis.rpush('test-list', 'one'), 1);
    assertStrictEq(await redis.rpush('test-list', 'two', 'three'), 3);
  }
});

test(async function lpop() {
  const redis = new RedisMock();

  await redis.lpush('test-list', '100');
  await redis.lpush('test-list', '200');

  assertStrictEq(await redis.lpop('test-list'), '200');
  assertStrictEq(await redis.llen('test-list'), 1);
});

test(async function llen() {
  const redis = new RedisMock();

  await redis.lpush('test-list', 'a');
  await redis.lpush('test-list', 'b');
  await redis.lpush('test-list', 'a');

  assertStrictEq(await redis.llen('test-list'), 3);
});

runIfMain(import.meta);
