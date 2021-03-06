import { assertEquals, assertStrictEq, assertArrayContains, assertThrowsAsync } from '../vendor/https/deno.land/std/testing/asserts.ts';
import { createMockRedis, WrongTypeOperationError, WrongNumberOfArgumentsError, ValueIsNotIntegerError, ValueIsNotValidFloatError } from '../mod.ts';

const { test } = Deno;

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

test(async function hsetnx() {
  const redis = createMockRedis();
  await redis.hsetnx('myhash', 'field', 'hello');
  assertStrictEq(
    await redis.hget('myhash', 'field'),
    'hello'
  );
});

test(async function hsetnxHasNoEffectWhenFieldAlreadyExists() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field', 'hello');
  await redis.hsetnx('myhash', 'field', 'world');
  assertStrictEq(
    await redis.hget('myhash', 'field'),
    'hello'
  );
});

test(async function hsetnxReturnsOneWhenNewFieldIsCreated() {
  const redis = createMockRedis();
  const reply = await redis.hsetnx('myhash', 'field', 'hello');
  assertStrictEq(reply, 1);
});

test(async function hsetnxReturnsZeroWhenFieldAlreadyExists() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field', 'one');
  const reply = await redis.hsetnx('myhash', 'field', 'two');
  assertStrictEq(reply, 0);
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

test(async function hmget() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field1', 'Hello');
  await redis.hset('myhash', 'field2', 'World');
  const reply = await redis.hmget('myhash', 'field1', 'field2', 'nofield');
  assertEquals(reply, ['Hello', 'World', undefined]);
});

test(async function hmgetTreatsNonExistingKeyAsEmptyHash() {
  const redis = createMockRedis();
  const reply = await redis.hmget('nosuchkey', 'field1', 'field2');
  assertEquals(reply, [undefined, undefined]);
});

test(async function hmgetDoesNotCreateNewKeyWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  await redis.hmget('nosuchkey', 'field1', 'field2');
  assertStrictEq(await redis.exists('nosuchkey'), 0);
});

test(async function hmgetThrowsErrorWhenTypeOfKeyIsNotHash() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  assertThrowsAsync(async () => {
    await redis.hmget('mylist', 'one');
  }, WrongTypeOperationError);
});

test(async function hmset() {
  const redis = createMockRedis();
  await redis.hmset('myhash', 'field1', 'one', 'field2', 'two');
  assertStrictEq(await redis.hget('myhash', 'field1'), 'one'); 
  assertStrictEq(await redis.hget('myhash', 'field2'), 'two');
});

test(async function hmsetReturnsOK() {
  const redis = createMockRedis();
  const reply = await redis.hmset('myhash', 'field1', 'hello');
  assertStrictEq(reply, 'OK');
});

test(async function hmsetThrowsErrorWhenTypeOfKeyIsNotHash() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.hmset('mylist', 'field', 'a');
  }, WrongTypeOperationError);
});

test(async function hmsetThrowsErrorWhenNumberOfArgumentsAreWrong() {
  const redis = createMockRedis();
  await assertThrowsAsync(async () => {
    await redis.hmset('myhash', 'field1', 'one', 'field2');
  }, WrongNumberOfArgumentsError);
});

test(async function hdel() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field1', 'one');
  await redis.hset('myhash', 'field2', 'two');
  await redis.hdel('myhash', 'field1');
  assertEquals(await redis.hkeys('myhash'), ['field2']);
});

test(async function hdelMultipleFields() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field1', 'one');
  await redis.hset('myhash', 'field2', 'two');
  await redis.hset('myhash', 'field3', 'three');
  await redis.hdel('myhash', 'field2', 'field3');
  assertEquals(await redis.hkeys('myhash'), ['field1']);
});

test(async function hdelReturnsNumberOfRemovedFields() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field1', 'a');  
  await redis.hset('myhash', 'field2', 'b');
  await redis.hset('myhash', 'field3', 'c');
  const reply = await redis.hdel('myhash', 'field1', 'nosuchfield', 'field2');
  assertStrictEq(reply, 2);
});

test(async function hdelDeletesKeyWhenAllFieldsAreRemoved() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field1', 'a');
  await redis.hdel('myhash', 'field1');
  assertStrictEq(await redis.exists('myhash'), 0);
});

test(async function hdelReturnsZeroWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  const reply = await redis.hdel('nosuchkey', 'field1');
  assertStrictEq(reply, 0);
});

test(async function hdelDoesNotCreateNewKey() {
  const redis = createMockRedis();
  await redis.hdel('nosuchkey', 'field1');
  assertStrictEq(await redis.exists('nosuchkey'), 0);
});

test(async function hdelThrowsErrorWhenTypeOfKeyIsNotHash() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.hdel('mylist', 'one');
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

test(async function hstrlen() {
  const redis = createMockRedis();

  await redis.hmset('myhash', 'f1', 'HelloWorld', 'f2', '99', 'f3', '-256');

  assertStrictEq(await redis.hstrlen('myhash', 'f1'), 10);
  assertStrictEq(await redis.hstrlen('myhash', 'f2'), 2);
  assertStrictEq(await redis.hstrlen('myhash', 'f3'), 4);
});

test(async function hstrlenReturnsZeroWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  const reply = await redis.hstrlen('nosuchkey', 'nosuchfield');
  assertStrictEq(reply, 0);
});

test(async function hstrlenReturnsZeroWhenFieldDoesNotExist() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field1', 'hello');
  const reply = await redis.hstrlen('myhash', 'nosuchfield');
  assertStrictEq(reply, 0);
});

test(async function hstrlenThrowsErrorWhenTypeOfKeyIsNotHash() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'hello');
  await assertThrowsAsync(async () => {
    await redis.hstrlen('mylist', 'hello');
  }, WrongTypeOperationError);
});

test(async function hincrby() {
  const redis = createMockRedis();

  await redis.hset('myhash', 'field', '5');

  assertStrictEq(
    await redis.hincrby('myhash', 'field', 1),
    6
  );

  assertStrictEq(
    await redis.hincrby('myhash', 'field', -1),
    5
  );

  assertStrictEq(
    await redis.hincrby('myhash', 'field', -10),
    -5
  );
});

test(async function hincrbySetIncrementToFieldWhenKeyDoesNotExist() {
  const redis = createMockRedis();

  await redis.hincrby('myhash', 'field1', 3);

  assertStrictEq(
    await redis.hget('myhash', 'field1'),
    '3'
  );
});

test(async function hincrbySetIncrementToFieldWhenFieldDoesNotExist() {
  const redis = createMockRedis();

  await redis.hset('myhash', 'field1', 'one');
  await redis.hincrby('myhash', 'field2', 5);

  assertStrictEq(
    await redis.hget('myhash', 'field2'),
    '5'
  );
});

test(async function hincrbyThrowsErrorWhenSpecifiedFieldIsNotInteger() {
  const redis = createMockRedis();

  await redis.hset('myhash', 'field1', 'hello');

  await assertThrowsAsync(async () => {
    await redis.hincrby('myhash', 'field1', 5);
  }, ValueIsNotIntegerError);
});

test(async function hincrbyfloat() {
  const redis = createMockRedis();

  await redis.hset('mykey', 'field', '10.5');

  assertStrictEq(
    await redis.hincrbyfloat('mykey', 'field', 0.1),
    '10.6'
  );

  assertStrictEq(
    await redis.hincrbyfloat('mykey', 'field', -5),
    '5.6'
  );
});

test(async function hincrbyfloatSetIncrementToFieldWhenKeyDoesNotExist() {
  const redis = createMockRedis();

  await redis.hincrbyfloat('myhash', 'field1', 0.5);

  assertStrictEq(
    await redis.hget('myhash', 'field1'),
    '0.5'
  );
});

test(async function hincrbyfloatSetIncrementToFieldWhenFieldDoesNotExist() {
  const redis = createMockRedis();

  await redis.hincrbyfloat('myhash', 'field1', 1.2);

  assertStrictEq(
    await redis.hget('myhash', 'field1'),
    '1.2'
  );
});

test(async function hincrbyfloatThrowsErrorWhenSpecifiedFieldIsNotValidFloat() {
  const redis = createMockRedis();

  await redis.hset('myhash', 'field1', 'one');

  await assertThrowsAsync(async () => {
    await redis.hincrbyfloat('myhash', 'field1', 0.8);
  }, ValueIsNotValidFloatError);
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

test(async function hvals() {
  const redis = createMockRedis();
  await redis.hset('myhash', 'field1', 'Hello');
  await redis.hset('myhash', 'field2', 'World');
  const reply = await redis.hvals('myhash');
  assertArrayContains(reply, ['Hello', 'World']);
  assertStrictEq(reply.length, 2);
});

test(async function hvalsReturnsEmptyArrayWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  const reply = await redis.hvals('nosuchkey');
  assertEquals(reply, []);
});

test(async function hvalsDoesNotCreateNewKeyWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  await redis.hvals('nosuchkey');
  assertStrictEq(await redis.exists('nosuchkey'), 0);
});

test(async function hvalsThrowsErrorWhenTypeOfKeyIsNotValid() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await assertThrowsAsync(async () => {
    await redis.hvals('mylist');
  }, WrongTypeOperationError);
});

