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

runIfMain(import.meta);
