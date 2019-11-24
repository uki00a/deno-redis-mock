import { runIfMain, test } from '../vendor/https/deno.land/std/testing/mod.ts';
import { assertEquals, assertStrictEq, assertArrayContains, assertThrowsAsync } from '../vendor/https/deno.land/std/testing/asserts.ts';
import { RedisMock, WrongTypeOperationError } from '../mod.ts';

test(async function sismember() {
  const redis = new RedisMock();

  await redis.sadd('hoge', 'hoge');
  await redis.sadd('hoge', 'piyo');

  assertStrictEq(await redis.sismember('hoge', 'hoge'), 1);
  assertStrictEq(await redis.sismember('hoge', 'piyo'), 1);
  assertStrictEq(await redis.sismember('hoge', 'fuga'), 0);

  assertStrictEq(await redis.sismember('piyo', 'hoge'), 0);
});

test(async function scard() {
  const redis = new RedisMock();
  await redis.sadd('myset', "Hello");
  await redis.sadd('myset', "World");
  assertStrictEq(await redis.scard('myset'), 2);
});

test(async function scardWhenKeyDoesNotExist() {
  const redis = new RedisMock();
  assertStrictEq(await redis.scard('nosuchkey'), 0, 'should return zero if a key does not exist');
  assertStrictEq(await redis.exists('nosuchkey'), 0, 'should not create a new key');
});

test(async function smembers() {
  const redis = new RedisMock();
  await redis.sadd('myset', 'Hello');
  await redis.sadd('myset', 'World');
  assertArrayContains(await redis.smembers('myset'), ['Hello', 'World']);
});

test(async function smembersWhenKeyDoesNotExist() {
  const redis = new RedisMock();
  assertEquals(await redis.smembers('nosuchkey'), [], 'should return an empty array if a key does not exist');
  assertStrictEq(await redis.exists('nosuchkey'), 0, 'should not create a new key');
});

test(async function sdiff() {
  const redis = new RedisMock();
  await redis.sadd('key1', 'a', 'b', 'c', 'd');
  await redis.sadd('key2', 'c');
  await redis.sadd('key3', 'a', 'c', 'e');

  const actual = await redis.sdiff('key1', 'key2', 'key3')
  const expected = ['b', 'd'];

  assertStrictEq(actual.length, expected.length);
  assertArrayContains(actual, expected);
});

test(async function sdiffShouldHandleWrongTypeValue() {
  const redis = new RedisMock();
  await redis.sadd('myset', 'a', 'b');
  await redis.lpush('mylist', 'a');
  await assertThrowsAsync(async () => {
    await redis.sdiff('myset', 'mylist');
  }, WrongTypeOperationError);
});

test(async function sdiffShouldHandleNonExistingKey() {
  {
    const redis = new RedisMock();
    await redis.sadd('myset', 'a');
    assertEquals(await redis.sdiff('nosuchkey', 'myset'), [], 'should treat a non-existing key as an empty set');
    assertStrictEq(await redis.exists('nosuchkey'), 0, 'should not create a new key');
  }

  {
    const redis = new RedisMock();
    await redis.sadd('myset', 'a', 'b');

    const actual = await redis.sdiff('myset', 'nosuchkey');
    const expected = ['a', 'b'];

    assertArrayContains(actual, expected, 'should treat a non-existing key as an empty-set');
    assertStrictEq(actual.length, expected.length);
    assertStrictEq(await redis.exists('nosuchkey'), 0, 'should not create a new key');
  }
});

runIfMain(import.meta);
