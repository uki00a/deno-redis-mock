import { runIfMain, test } from '../vendor/https/deno.land/std/testing/mod.ts';
import { assertEquals, assertStrictEq, assertArrayContains, assertThrowsAsync } from '../vendor/https/deno.land/std/testing/asserts.ts';
import { createMockRedis, WrongTypeOperationError } from '../mod.ts';

test(async function hsethget() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field1', 'foo');
  const value = await redis.hget('myhash', 'field1');
  assertStrictEq(value, 'foo');
});

test(async function hsetReturnsNumberOfFieldsThatWereAdded() {
  const redis = createMockRedis();
  const reply = await redis.hset('myhash', 'field1', 'one');
  assertStrictEq(reply, 1);
});

test(async function hsetThrowsErrorWhenTypeOfKeyIsNotHash() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.hset('mylist', 'field', 'a');
  }, WrongTypeOperationError);
});

test(async function hgetReturnsUndefinedWhenFieldDoesNotExist() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field1', 'foo');
  const reply = await redis.hget('myhash', 'nosuchfield');
  assertStrictEq(reply, undefined);
});

test(async function hgetReturnsUndefinedWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  const reply = await redis.hget('nosuchkey', 'nosuchfield');
  assertStrictEq(reply, undefined);
});

test(async function hgetThrowsErrorWhenTypeOfKeyIsNotHash() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.hget('mylist', 'field');
  }, WrongTypeOperationError);
});

runIfMain(import.meta);
