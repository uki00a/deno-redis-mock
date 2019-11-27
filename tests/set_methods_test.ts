import { runIfMain, test } from '../vendor/https/deno.land/std/testing/mod.ts';
import { assertEquals, assertStrictEq, assertArrayContains, assertThrowsAsync } from '../vendor/https/deno.land/std/testing/asserts.ts';
import { createMockRedis, WrongTypeOperationError } from '../mod.ts';

test(async function sismember() {
  const redis = createMockRedis();

  await redis.sadd('hoge', 'hoge');
  await redis.sadd('hoge', 'piyo');

  assertStrictEq(await redis.sismember('hoge', 'hoge'), 1);
  assertStrictEq(await redis.sismember('hoge', 'piyo'), 1);
  assertStrictEq(await redis.sismember('hoge', 'fuga'), 0);

  assertStrictEq(await redis.sismember('piyo', 'hoge'), 0);
});

test(async function scard() {
  const redis = createMockRedis();
  await redis.sadd('myset', "Hello");
  await redis.sadd('myset', "World");
  assertStrictEq(await redis.scard('myset'), 2);
});

test(async function scardWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  assertStrictEq(await redis.scard('nosuchkey'), 0, 'should return zero if a key does not exist');
  assertStrictEq(await redis.exists('nosuchkey'), 0, 'should not create a new key');
});

test(async function smembers() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'Hello');
  await redis.sadd('myset', 'World');
  assertArrayContains(await redis.smembers('myset'), ['Hello', 'World']);
});

test(async function smembersWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  assertEquals(await redis.smembers('nosuchkey'), [], 'should return an empty array if a key does not exist');
  assertStrictEq(await redis.exists('nosuchkey'), 0, 'should not create a new key');
});

test(async function sdiff() {
  const redis = createMockRedis();
  await redis.sadd('key1', 'a', 'b', 'c', 'd');
  await redis.sadd('key2', 'c');
  await redis.sadd('key3', 'a', 'c', 'e');

  const actual = await redis.sdiff('key1', 'key2', 'key3')
  const expected = ['b', 'd'];

  assertStrictEq(actual.length, expected.length);
  assertArrayContains(actual, expected);
});

test(async function sdiffThrowsWrongTypeValueError() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'a', 'b');
  await redis.lpush('mylist', 'a');
  await assertThrowsAsync(async () => {
    await redis.sdiff('myset', 'mylist');
  }, WrongTypeOperationError);
});

test(async function sdiffWhenKeyDoesNot() {
  {
    const redis = createMockRedis();
    await redis.sadd('myset', 'a');
    assertEquals(await redis.sdiff('nosuchkey', 'myset'), [], 'should treat a non-existing key as an empty set');
    assertStrictEq(await redis.exists('nosuchkey'), 0, 'should not create a new key');
  }

  {
    const redis = createMockRedis();
    await redis.sadd('myset', 'a', 'b');

    const actual = await redis.sdiff('myset', 'nosuchkey');
    const expected = ['a', 'b'];

    assertArrayContains(actual, expected, 'should treat a non-existing key as an empty-set');
    assertStrictEq(actual.length, expected.length);
    assertStrictEq(await redis.exists('nosuchkey'), 0, 'should not create a new key');
  }
});

test(async function spop() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'a');
  await redis.sadd('myset', 'b');

  const actual = await redis.spop('myset');
  const expected = actual === 'a' ? 'a' : 'b';

  assertStrictEq(actual, expected);
  assertStrictEq(await redis.scard('myset'), 1);
});

test(async function spopFromSigletonSet() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'a');
  assertStrictEq(await redis.spop('myset'), 'a');
  assertStrictEq(await redis.exists('myset'), 0);
});

test(async function spopWithCount() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'a');
  await redis.sadd('myset', 'b');
  await redis.sadd('myset', 'c');

  assertArrayContains(await redis.spop('myset', 3), ['a', 'b', 'c']);
  assertStrictEq(await redis.exists('myset'), 0);
});

test(async function spopWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  assertStrictEq(await redis.spop('nosuchkey'), undefined);
});

test(async function spopWithCountWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  assertEquals(await redis.spop('nosuchkey', 2), []);
});

test(async function spopFromNonSet() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'a');
  assertStrictEq(await redis.spop('mylist'), undefined);
  assertEquals(await redis.spop('mylist', 2), []);
});

test(async function srem() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'one');
  await redis.sadd('myset', 'two');
  await redis.sadd('myset', 'three');
  await redis.sadd('myset', 'four');

  assertStrictEq(await redis.srem('myset', 'one'), 1);
  assertStrictEq(await redis.srem('myset', 'three', 'four', 'three', 'five'), 2);
  assertStrictEq(await redis.srem('myset', 'six'), 0);
  assertEquals(await redis.smembers('myset'), ['two']);
});

test(async function sremThrowsWrongTypeOperationError() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');

  await assertThrowsAsync(async () => {
    await redis.srem('mylist', 'one');
  }, WrongTypeOperationError);
});

test(async function sremWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  assertStrictEq(await redis.srem('nosuchkey', 'a'), 0);
  assertStrictEq(await redis.exists('nosuchkey'), 0);
});

test(async function sremRemovesKeyWhenSetIsEmpty() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'a', 'b');
  await redis.srem('myset', 'a', 'b');
  assertStrictEq(await redis.exists('myset'), 0);
});

runIfMain(import.meta);
