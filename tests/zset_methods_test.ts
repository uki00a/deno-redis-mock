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

runIfMain(import.meta);
