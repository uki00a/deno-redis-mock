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

test(async function hgetall() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field1', 'Hello');
  await redis.hset('myhash', 'field2', 'World');
  const reply = await redis.hgetall('myhash');
  assertEquals(reply, ['field1', 'Hello', 'field2', 'World']);
});

test(async function hgetallReturnsEmptyArrayWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  const reply = await redis.hgetall('nosuchkey');
  assertEquals(reply, []);
});

test(async function hgetallThrowsErrorWhenTypeOfKeyIsNotHash() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.hgetall('mylist');
  }, WrongTypeOperationError);
});

test(async function hexistsReturnsOneWhenSpecifiedFieldExists() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field', 'foo');
  const reply = await redis.hexists('myhash', 'field');
  assertStrictEq(reply, 1);
});

test(async function hexistsReturnsZeroWhenSpecifiedFieldDoesNotExist() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field', 'foo');
  const reply = await redis.hexists('myhash', 'nosuchfield');
  assertStrictEq(reply, 0);
});

test(async function hexistsReturnsZeroWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  const reply = await redis.hexists('nosuchkey', 'field');
  assertStrictEq(reply, 0);
});

test(async function hexistsThrowsErrorWhenTypeOfKeyIsNotHash() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.hexists('mylist', 'field');
  }, WrongTypeOperationError);
});

test(async function hlen() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field1', 'Hello');
  await redis.hset('myhash', 'field2', 'World');
  const reply = await redis.hlen('myhash');
  assertStrictEq(reply, 2);
});

test(async function hlenReturnsZeroIfKeyDoesNotExist() {
  const redis = createMockRedis();
  const reply = await redis.hlen('nosuchkey');
  assertStrictEq(reply, 0);
});

test(async function hlenThrowsErrorWhenTypeOfKeyIfNotHash() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.hlen('mylist');
  }, WrongTypeOperationError);
});

test(async function hkeys() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field1', 'Hello');
  await redis.hset('myhash', 'field2', 'World');
  const reply = await redis.hkeys('myhash');
  assertEquals(reply, ["field1", "field2"]);
});

test(async function hkeysReturnsEmptyArrayWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  const reply = await redis.hkeys('nosuchkey');
  assertEquals(reply, []);
});

test(async function hkeysThrowsErrorWhenTypeOfKeyIsNotHash() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.hkeys('mylist');
  }, WrongTypeOperationError);
});

runIfMain(import.meta);
