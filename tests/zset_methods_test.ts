import { runIfMain, test } from '../vendor/https/deno.land/std/testing/mod.ts';
import { assertEquals, assertStrictEq, assertArrayContains, assertThrowsAsync } from '../vendor/https/deno.land/std/testing/asserts.ts';
import { createMockRedis, WrongTypeOperationError } from '../mod.ts';

test(async function zcard() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  const reply = await redis.zcard('myzset');
  assertStrictEq(reply, 2);
});

test(async function zcardReturnsZeroWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  const reply = await redis.zcard('nosuchkey');
  assertStrictEq(reply, 0);
});

test(async function zcardDoesNotCreateNewKey() {
  const redis = createMockRedis();
  await redis.zcard('nosuchkey');
  assertStrictEq(await redis.exists('nosuchkey'), 0);
});

test(async function zcardThrowsErrorWhenTypeOfKeyIsNotZSet() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.zcard('mylist');
  }, WrongTypeOperationError);
});

test(async function zscore() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  const reply = await redis.zscore('myzset', 'one');
  assertStrictEq(reply, "1");
});

test(async function zscoreReturnsNilWhenWhenMemberDoesNotExist() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'member1');
  const reply = await redis.zscore('myzset', 'nosuchmember');
  assertStrictEq(reply, undefined);
});

test(async function zscoreReturnsNilWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  const reply = await redis.zscore('nosuchkey', 'member1');
  assertStrictEq(reply, undefined);
});

test(async function zscoreDoesNotCreateNewKey() {
  const redis = createMockRedis();
  await redis.zscore('nosuchkey', 'member1');
  assertStrictEq(await redis.exists('nosuchkey'), 0);
});

test(async function zscoreThrowsErrorWhenTypeOfKeyIsNotZSet() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.zscore('mylist', 'one');
  }, WrongTypeOperationError);
});

test(async function zrank() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  await redis.zadd('myzset', 3, 'three');
  const reply = await redis.zrank('myzset', 'three');
  assertStrictEq(reply, 2);
});

test(async function zrankReturnsUndefinedWhenMemberDoesNotExist() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 100, 'member1');
  const reply = await redis.zrank('myzset', 'nosuchmember');
  assertStrictEq(reply, undefined);
});

test(async function zrankReturnsUndefinedWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  const reply = await redis.zrank('myzset', 'nosuchkey');
  assertStrictEq(reply, undefined);
});

test(async function zrankDoesNotCreateNewKey() {
  const redis = createMockRedis();
  await redis.zrank('myzset', 'nosuchkey');
  assertStrictEq(await redis.exists('myzset'), 0);
});

test(async function zrankThrowsErrorWhenTypeOfKeyIsNotZset() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.zrank('mylist', 'one');
  }, WrongTypeOperationError);
});

test(async function zrevrank() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  await redis.zadd('myzset', 3, 'three');
  const reply = await redis.zrevrank('myzset', 'one');
  assertStrictEq(reply, 2);
});

test(async function zrevrankReturnsUndefinedWhenMemberDoesNotExist() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 100, 'member1');
  const reply = await redis.zrevrank('myzset', 'nosuchmember');
  assertStrictEq(reply, undefined);
});

test(async function zrevrankReturnsUndefinedWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  const reply = await redis.zrevrank('myzset', 'nosuchkey');
  assertStrictEq(reply, undefined);
});

test(async function zrevrankDoesNotCreateNewKey() {
  const redis = createMockRedis();
  await redis.zrevrank('myzset', 'nosuchkey');
  assertStrictEq(await redis.exists('myzset'), 0);
});

test(async function zrevrankThrowsErrorWhenTypeOfKeyIsNotZset() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.zrevrank('mylist', 'one');
  }, WrongTypeOperationError);
});

test(async function zincrby() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 5, 'one');
  await redis.zincrby('myzset', 3, 'one');
  const score = await redis.zscore('myzset', 'one');
  assertStrictEq('8', score);
});

test(async function zincrbyReturnsTheNewScoreOfMember() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  const reply = await redis.zincrby('myzset', 2, 'one');
  assertStrictEq(reply, '3');
});

test(async function zincrbyCreateNewZSetWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  await redis.zincrby('myzset', 1.5, 'member1');
  const score = await redis.zscore('myzset', 'member1');
  assertStrictEq(score, '1.5');
});

test(async function zincrbySetIncrementToScoreWhenMemberDoesNotExist() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 3, 'member1');
  await redis.zincrby('myzset', 5, 'member2');
  const score = await redis.zscore('myzset', 'member2');
  assertStrictEq(score, '5');
});

test(async function zincrbyThrowsErrorWhenTypeOfKeyIsNotZSet() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.zincrby('mylist', 4, 'one');
  }, WrongTypeOperationError);
});

test(async function zrem() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  await redis.zadd('myzset', 3, 'three');
  await redis.zrem('myzset', 'two');
  assertStrictEq(await redis.zscore('myzset', 'two'), undefined);
  assertStrictEq(await redis.zcard('myzset'), 2);
});

test(async function zremCanRemoveMultipleMembers() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  await redis.zadd('myzset', 3, 'three');
  await redis.zrem('myzset', 'one', 'three');
  assertStrictEq(await redis.zscore('myzset', 'one'), undefined);
  assertStrictEq(await redis.zscore('myzset', 'three'), undefined);
  assertStrictEq(await redis.zcard('myzset'), 1);
});

test(async function zremReturnsNumberOfRemovedMembers() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  await redis.zadd('myzset', 3, 'three');
  const reply = await redis.zrem('myzset', 'one', 'four', 'three', 'five');
  assertStrictEq(reply, 2);
});

test(async function zremDeletesKeyWhenAllMembersAreRemoved() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'member1');
  await redis.zadd('myzset', 2, 'member2');
  await redis.zrem('myzset', 'member1', 'member2');
  assertStrictEq(await redis.exists('myzset'), 0);
});

test(async function zremDoesNotCreateNewKey() {
  const redis = createMockRedis();
  await redis.zrem('nosuchkey', 'member');
  assertStrictEq(await redis.exists('nosuchkey'), 0);
});

test(async function zremThrowsErrorWhenTypeOfKeyIsNotZset() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.zrem('mylist', 'one');
  }, WrongTypeOperationError);
});

test(async function zrange() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  await redis.zadd('myzset', 3, 'three');
  assertEquals(await redis.zrange('myzset', 0, 1), ['one', 'two']);
});

test(async function zrangeWithScores() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  await redis.zadd('myzset', 3, 'three');
  assertEquals(await redis.zrange('myzset', 0, 1, { withScore: true }), ['one', '1', 'two', '2']);
});

test(async function zrangeReturnsEmptyArrayWhenStartIsLargerThanLargestIndex() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  assertEquals(await redis.zrange('myzset', 1, 2), []);
});

test(async function zrangeReturnsEmptyArrayWhenStartIsGreaterThanStop() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  assertEquals(await redis.zrange('myzset', 1, 0), []);
});

test(async function zrangeTreatsStopAsEndOfZSetWhenLargerThanLargestIndex() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  assertEquals(await redis.zrange('myzset', 0, 4), ['one', 'two']);
});

test(async function zrangeHandlesNegativeIndex() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  await redis.zadd('myzset', 3, 'three');
  assertEquals(await redis.zrange('myzset', -2, -1), ['two', 'three']);
});

test(async function zrangeReturnsEmptyArrayWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  assertEquals(await redis.zrange('nosuchkey', 0, 1), []);
});

test(async function zrangeDoesNotCreateNewKey() {
  const redis = createMockRedis();
  await redis.zrange('nosuchkey', 0, 1);
  assertStrictEq(await redis.exists('nosuchkey'), 0);
});

test(async function zrangeThrowsErrosWhenTypeOfKeyIsNotZSet() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.zrange('mylist', 0, 1);
  }, WrongTypeOperationError);
});

test(async function zrevrange() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  await redis.zadd('myzset', 3, 'three');
  assertEquals(await redis.zrevrange('myzset', 0, 1), ['three', 'two']);
});

test(async function zrevrangeWithScores() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  await redis.zadd('myzset', 3, 'three');
  assertEquals(await redis.zrevrange('myzset', 0, 1, { withScore: true }), ['three', '3', 'two', '2']);
});

test(async function zrevrangeReturnsEmptyArrayWhenStartIsLargerThanLargestIndex() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  assertEquals(await redis.zrevrange('myzset', 1, 2), []);
});

test(async function zrevrangeReturnsEmptyArrayWhenStartIsGreaterThanStop() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  assertEquals(await redis.zrevrange('myzset', 1, 0), []);
});

test(async function zrevrangeTreatsStopAsEndOfZSetWhenLargerThanLargestIndex() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  assertEquals(await redis.zrevrange('myzset', 0, 4), ['two', 'one']);
});

test(async function zrevrangeHandlesNegativeIndex() {
  const redis = createMockRedis();
  await redis.zadd('myzset', 1, 'one');
  await redis.zadd('myzset', 2, 'two');
  await redis.zadd('myzset', 3, 'three');
  assertEquals(await redis.zrevrange('myzset', -2, -1), ['two', 'one']);
});

test(async function zrevrangeReturnsEmptyArrayWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  assertEquals(await redis.zrevrange('nosuchkey', 0, 1), []);
});

test(async function zrevrangeDoesNotCreateNewKey() {
  const redis = createMockRedis();
  await redis.zrevrange('nosuchkey', 0, 1);
  assertStrictEq(await redis.exists('nosuchkey'), 0);
});

test(async function zrevrangeThrowsErrosWhenTypeOfKeyIsNotZSet() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.zrevrange('mylist', 0, 1);
  }, WrongTypeOperationError);
});

test(async function zrangebyscore() {
  const redis = createMockRedis();
  redis.zadd('myzset', 1, 'one');
  redis.zadd('myzset', 3, 'three');
  redis.zadd('myzset', 5, 'five');
  redis.zadd('myzset', 10, 'ten');
  assertEquals(await redis.zrangebyscore('myzset', 2, 6), ['three', 'five']);
});

test(async function zrangebyscoreWithScores() {
  const redis = createMockRedis();
  redis.zadd('myzset', 1, 'one');
  redis.zadd('myzset', 3, 'three');
  redis.zadd('myzset', 5, 'five');
  redis.zadd('myzset', 10, 'ten');

  const reply = await redis.zrangebyscore('myzset', 2, 6, { withScore: true });
  assertEquals(reply, ['three', '3', 'five', '5']);
});

test(async function zrangebyscoreWithLimit() {
  const redis = createMockRedis();
  redis.zadd('myzset', 1, 'one');
  redis.zadd('myzset', 2, 'two');
  redis.zadd('myzset', 3, 'three');
  redis.zadd('myzset', 4, 'four');
  redis.zadd('myzset', 5, 'five');
  redis.zadd('myzset', 10, 'ten');

  const reply = await redis.zrangebyscore('myzset', 2, 6, { count: 2, offset: 1 });
  assertEquals(reply, ['three', 'four']);
});

test(async function zrangebyscoreReturnsAllElementsFromOffsetWhenCountIsNegative() {
  const redis = createMockRedis();
  redis.zadd('myzset', 1, 'one');
  redis.zadd('myzset', 2, 'two');
  redis.zadd('myzset', 3, 'three');
  redis.zadd('myzset', 4, 'four');
  redis.zadd('myzset', 5, 'five');
  redis.zadd('myzset', 10, 'ten');

  const reply = await redis.zrangebyscore('myzset', 2, 6, { count: -2, offset: 1 });
  assertEquals(reply, ['three', 'four', 'five']);
});

test(async function zrangebyscoreReturnsEmptyArrayWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  assertEquals(await redis.zrangebyscore('nosuchkey', 0, 2), []);
});

test(async function zrangebyscoreDoesNotCreateNewKey() {
  const redis = createMockRedis();
  await redis.zrangebyscore('nosuchkey', 0, 2)
  assertStrictEq(await redis.exists('nosuchkey'), 0);
});

test(async function zrangebyscoreThrowsErrorWhenTypeOfKeyIsNotZSet() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.zrangebyscore('mylist', 0, 2);
  }, WrongTypeOperationError);
});

runIfMain(import.meta);
