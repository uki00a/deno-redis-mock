import { assertEquals, assertStrictEq, assertArrayContains, assertThrowsAsync } from '../vendor/https/deno.land/std/testing/asserts.ts';
import { createMockRedis, WrongTypeOperationError } from '../mod.ts';

const { test } = Deno;

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

test(async function sdiffstore() {
  const redis = createMockRedis();

  await redis.sadd('key1', 'a', 'b', 'c', 'd');
  await redis.sadd('key2', 'c');
  await redis.sadd('key2', 'd', 'e');

  const reply = await redis.sdiffstore('key', 'key1', 'key2', 'key3');
  assertStrictEq(reply, 2);

  const expected = ['a', 'b'];
  const actual = await redis.smembers('key');
  assertArrayContains(actual, expected);
  assertStrictEq(actual.length, expected.length);
});

test(async function sdiffstoreOverwriteDestinationKeyWhenAlreadyExists() {
  const redis = createMockRedis();
  await redis.rpush('destination', 'a', 'b', 'c');
  await redis.sadd('key1', 'one', 'two', 'three');
  await redis.sadd('key2', 'three', 'four', 'five');

  const reply = await redis.sdiffstore('destination', 'key1', 'key2');
  assertStrictEq(reply, 2);

  const expected = ['one', 'two'];
  const actual = await redis.smembers('destination');

  assertArrayContains(actual, expected);
  assertStrictEq(actual.length, expected.length);
});

test(async function sdiffstoreThrowsWhenWrongTypeValueExists() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'a', 'b');
  await redis.lpush('mylist', 'a');
  await assertThrowsAsync(async () => {
    await redis.sdiffstore('destination', 'myset', 'mylist');
  }, WrongTypeOperationError);
});

test(async function sdiffstoreTreatsNonExistingKeyAsEmptySet() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'a', 'b');

  const reply = await redis.sdiffstore('destination', 'myset', 'nosuchkey')
  assertStrictEq(reply, 2);

  const expected = ['a', 'b'];
  const actual = await redis.smembers('destination');

  assertArrayContains(actual, expected);
  assertStrictEq(actual.length, expected.length);
});

test(async function sdiffstoreDoesNotCreateDestinationKeyWhendifferenceIsEmpty() {
  const redis = createMockRedis();
  await redis.sadd('key1', 'one', 'two');
  await redis.sadd('key2', 'one', 'two');

  const reply = await redis.sdiffstore('destination', 'key1', 'key2');
  assertStrictEq(reply, 0);
  assertStrictEq(await redis.exists('destination'), 0);
});

test(async function sinter() {
  const redis = createMockRedis();
  await redis.sadd('key1', 'a', 'b', 'c', 'd');
  await redis.sadd('key2', 'c');
  await redis.sadd('key3', 'a', 'c', 'e');

  const expected = ['c'];
  const actual = await redis.sinter('key1', 'key2', 'key3');

  assertEquals(actual, expected);
});

test(async function sinterThrowsErrorWhenWrongTypeValueExists() {
  const redis = createMockRedis();
  await redis.sadd('key1', 'one', 'two');
  await redis.sadd('key2', 'two', 'three');
  await redis.rpush('key3', 'three', 'four');

  await assertThrowsAsync(async () => {
    await redis.sinter('key1', 'key2', 'key3');
  }, WrongTypeOperationError);
});

test(async function sinterStopComputingWhenEmptySetIsFound() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'one', 'two');
  await redis.rpush('mylist', 'a');

  const actual = await redis.sinter('destination', 'myset', 'nosuchkey', 'mylist');
  const expected = [] as string[];

  assertEquals(actual, expected);
});

test(async function sinterstore() {
  const redis = createMockRedis();
  await redis.sadd('key1', 'a', 'b', 'c', 'd');
  await redis.sadd('key2', 'c', "d", 'e', 'f');

  const reply = await redis.sinterstore('destination', 'key1', 'key2');
  assertStrictEq(reply, 2);

  const actual = await redis.smembers('destination');
  const expected = ['c', 'd'];
  assertArrayContains(actual, expected);
  assertStrictEq(actual.length, expected.length);
});

test(async function sinterstoreOverwriteDestinationKeyWhenAlreadyExists() {
  const redis = createMockRedis();
  await redis.rpush('destination', 'a', 'b', 'c');
  await redis.sadd('key1', 'one', 'two');
  await redis.sadd('key2', 'two', 'three');

  const reply = await redis.sinterstore('destination', 'key1', 'key2');
  assertStrictEq(reply, 1);

  const actual = await redis.smembers('destination');
  const expected = ['two'];
  assertEquals(actual, expected);
});

test(async function sinterstoreThrowsWhenWrongTypeValueExists() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'a');
  await redis.rpush('mylist', 'one');

  await assertThrowsAsync(async () => {
    await redis.sinterstore('destination', 'myset', 'mylist');
  }, WrongTypeOperationError);
});

test(async function sinterstoreStopComputingWhenEmptySetIsFound() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'a');
  await redis.rpush('mylist', 'one');

  const reply = await redis.sinterstore('destination', 'myset', 'nosuchkey', 'mylist');
  assertStrictEq(reply, 0);
});

test(async function sinterstoreDoesNotCreateDestinationKeyWhenIntersectionIsEmpty() {
  const redis = createMockRedis();
  await redis.sadd('key1', 'one');
  await redis.sadd('key2', 'two');

  const reply = await redis.sinterstore('destination', 'key1', 'key2');
  assertStrictEq(reply, 0);
  assertStrictEq(await redis.exists('destination'), 0);
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

test(async function smove() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'one');
  await redis.sadd('myset', 'two');
  await redis.sadd('myotherset', 'three');

  assertStrictEq(await redis.smove('myset', 'myotherset', 'two'), 1);

  assertEquals(await redis.smembers('myset'), ['one']);
  assertArrayContains(await redis.smembers('myotherset'), ['two', 'three']);
});

test(async function smoveReturnsZeroWhenSourceDoesNotExist() {
  const redis = createMockRedis();
  assertStrictEq(await redis.smove('nosuchkey', 'myset', 'one'), 0);
  assertStrictEq(await redis.exists('nosuchkey'), 0);
});

test(async function smoveReturnsZeroWhenSpecifiedMemberDoesNotExist() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'one');
  await redis.sadd('myotherset', 'a');

  assertStrictEq(await redis.smove('myset', 'myotherset', 'two'), 0);
  assertEquals(await redis.smembers('myset'), ['one']);
  assertEquals(await redis.smembers('myotherset'), ['a']);
});

test(async function smoveRemovesKeyWhenSourceSetIsEmpty() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'one');
  await redis.sadd('myotherset', 'two');

  assertStrictEq(await redis.smove('myset', 'myotherset', 'one'), 1);

  assertStrictEq(await redis.exists('myset'), 0);
});

test(async function smoveCreatesKeyWhenDestinationSetDoesNotExist() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'one');

  assertStrictEq(await redis.smove('myset', 'myotherset', 'one'), 1);

  assertEquals(await redis.smembers('myotherset'), ['one']);
});

test(async function smoveThrowsErrorWhenSourceIsNotSet() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await redis.sadd('myset', 'a');

  await assertThrowsAsync(async () => {
    await redis.smove('mylist', 'myset', 'one');
  }, WrongTypeOperationError);
});

test(async function smoveThrowsErrorWhenDestinationIsNotSet() {
  const redis = createMockRedis();
  await redis.sadd('myset', 'one');
  await redis.rpush('mylist', 'a');

  await assertThrowsAsync(async () => {
    await redis.smove('myset', 'mylist', 'one');
  }, WrongTypeOperationError);
});

