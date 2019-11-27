import { runIfMain, test } from '../vendor/https/deno.land/std/testing/mod.ts';
import { assertStrictEq, assertArrayContains, assertEquals, assertThrowsAsync } from '../vendor/https/deno.land/std/testing/asserts.ts';
import { createMockRedis, IndexOutOfRangeError, WrongTypeOperationError } from '../mod.ts';

test(async function lindex() {
  const redis = createMockRedis();

  await redis.lpush('test-list', 'D', 'C', 'B', 'A');

  assertStrictEq(await redis.lindex('test-list', 0), 'A');
  assertStrictEq(await redis.lindex('test-list', 2), 'C');
  assertStrictEq(await redis.lindex('test-list', -1), 'D');
  assertStrictEq(await redis.lindex('test-list', -3), 'B');
  assertStrictEq(await redis.lindex('test-list', 4), undefined);
  assertStrictEq(await redis.lindex('test-list', -5), undefined);
});

test(async function lrange() {
  const redis = createMockRedis();

  await redis.rpush('mylist', 'one');
  await redis.rpush('mylist', 'two');
  await redis.rpush('mylist', 'three');

  assertEquals(await redis.lrange('mylist', 0, 0), ['one']);
  assertEquals(await redis.lrange('mylist', -3, 2), ['one', 'two', 'three']);
  assertEquals(await redis.lrange('mylist', -100, 100), ['one', 'two', 'three']);
  assertEquals(await redis.lrange('mylist', 5, 10), []);

  assertEquals(await redis.lrange('non_existing_key', 0, -1), []);
  assertStrictEq(await redis.exists('non_existing_key'), 0, '\'LRANGE\' should not create a new key if not exists');
});

test(async function lpush() {
  const redis = createMockRedis();

  assertStrictEq(await redis.lpush('test-list', 'a'), 1);
  assertStrictEq(await redis.lpush('test-list', 'b', 'c'), 3);
});

test(async function lpushx() {
  const redis = createMockRedis();
  await redis.lpush('mylist', 'World');
  assertStrictEq(await redis.lpushx('mylist', 'Hello'), 2);
  assertStrictEq(await redis.lpushx('myotherlist', 'Hello'), 0);

  assertEquals(await redis.lrange('mylist', 0, -1), ['Hello', 'World']);

  assertStrictEq(
    await redis.exists('myotherlist'),
    0,
    '\'LPUSHX\' should not create a new key'
  );
});

test(async function rpush() {
  {
    const redis = createMockRedis();

    assertStrictEq(await redis.rpush('test-list', 'one'), 1);
    assertStrictEq(await redis.rpush('test-list', 'two', 'three'), 3);
  }
});

test(async function rpushx() {
  const redis = createMockRedis();

  await redis.rpush('mylist', 'one');

  assertStrictEq(await redis.rpushx('mylist', 'two'), 2);
  assertStrictEq(await redis.rpushx('mylist', 'three'), 3);
  assertStrictEq(await redis.rpushx('myotherlist', 'one'), 0);

  assertEquals(await redis.lrange('mylist', 0, -1), ['one', 'two', 'three']);
  assertStrictEq(await redis.exists('myotherlist'), 0);
});

test(async function lpop() {
  const redis = createMockRedis();

  await redis.lpush('test-list', '100');
  await redis.lpush('test-list', '200');

  assertStrictEq(await redis.lpop('test-list'), '200');
  assertStrictEq(await redis.llen('test-list'), 1);
});

test(async function lpopFromSingletonList() {
  const redis = createMockRedis();
  await redis.rpush('myotherlist', 'one');
  assertStrictEq(await redis.lpop('myotherlist'), 'one');
  assertStrictEq(await redis.exists('myotherlist'), 0, 'should remove a key if a list was singleton');
});

test(async function lpopWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  assertStrictEq(await redis.lpop('nosuchkey'), undefined);
  assertStrictEq(await redis.exists('nosuchkey'), 0, 'should not create a new key if not exists');
});

test(async function rpop() {
  const redis = createMockRedis();

  await redis.rpush('mylist', 'one');
  await redis.rpush('mylist', 'two');
  await redis.rpush('mylist', 'three');

  assertStrictEq(await redis.rpop('mylist'), 'three');
  assertEquals(await redis.lrange('mylist', 0, -1), ['one', 'two'], 'should remove a key if a last element is popped');
});

test(async function rpopFromSingletonList() {
  const redis = createMockRedis();
  await redis.rpush('myotherlist', 'one');
  assertStrictEq(await redis.rpop('myotherlist'), 'one');
  assertStrictEq(await redis.exists('myotherlist'), 0, 'should remove a key if a list was singleton');
});

test(async function rpopWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  assertStrictEq(await redis.rpop('nosuchkey'), undefined);
  assertStrictEq(await redis.exists('nosuchkey'), 0, 'should not create a new key if not exists');
});

test(async function rpoplpush() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await redis.rpush('mylist', 'two');
  await redis.rpush('mylist', 'three');

  assertStrictEq(await redis.rpoplpush('mylist', 'myotherlist'), 'three');

  assertEquals(await redis.lrange('mylist', 0, -1), ["one", "two"]);
  assertEquals(await redis.lrange('myotherlist', 0, -1), ['three']);
});

test(async function rpoplpushDeletesKeyOfSourceListWhenEmpty() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await redis.rpush('myotherlist', '1');

  assertStrictEq(await redis.rpoplpush('mylist', 'myotherlist'), 'one');

  assertStrictEq(await redis.exists('mylist'), 0, 'should delete a source list');
  assertEquals(await redis.lrange('myotherlist', 0, -1), ['one', '1']);
});

test(async function rpoplpushWhenKeyDoesNotExist() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');

  assertStrictEq(await redis.rpoplpush('nosuchkey', 'mylist'), undefined);

  assertStrictEq(await redis.exists('nosuchkey'), 0);
  assertEquals(await redis.lrange('mylist', 0, -1), ['one']);
});

test(async function lrem() {
  for (const tc of [
    {
      expected: {
        list: ['hello', 'foo'],
        numRemoved: 2,
      },
      given: {
        count: -2,
        element: 'hello'
      }
    },
    {
      expected: {
        list: ['foo', 'hello'],
        numRemoved: 2
      },
      given: {
        count: 2,
        element: 'hello'
      }
    },
    {
      expected: {
        list: ['foo'],
        numRemoved: 3
      },
      given: {
        count: 0,
        element: 'hello'
      }
    }
  ]) {
    const redis = createMockRedis();
    await redis.rpush('mylist', 'hello');
    await redis.rpush('mylist', 'hello');
    await redis.rpush('mylist', 'foo');
    await redis.rpush('mylist', 'hello');

    assertStrictEq(await redis.lrem('mylist', tc.given.count, tc.given.element), tc.expected.numRemoved);
    assertEquals(await redis.lrange('mylist', 0, -1), tc.expected.list);
  }
});

test(async function lremFromSingletonList() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await redis.rpush('mylist', 'one');

  await redis.lrem('mylist', 2, 'one');

  assertStrictEq(await redis.exists('mylist'), 0, 'should remove a key if no elements remain');
});

test(async function lset() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await redis.rpush('mylist', 'two');
  await redis.rpush('mylist', 'three');

  assertStrictEq(await redis.lset('mylist', 0, 'four'), 'OK');
  assertStrictEq(await redis.lset('mylist', -2, 'five'), 'OK');
  assertEquals(await redis.lrange('mylist', 0, -1), [
    'four',
    'five',
    'three',
  ]);
});

test(async function lsetAtOutOfRangeIndex() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await redis.rpush('mylist', 'two');
  await redis.rpush('mylist', 'three');

  await assertThrowsAsync(
    async () => {
      await redis.lset('mylist', 3, 'four');
    },
    IndexOutOfRangeError,
    'index out of range'
  );

  await assertThrowsAsync(
    async () => {
      await redis.lset('mylist', -4, 'zero');
    },
    IndexOutOfRangeError,
    'index out of range'
  );
});

test(async function llen() {
  const redis = createMockRedis();

  await redis.lpush('test-list', 'a');
  await redis.lpush('test-list', 'b');
  await redis.lpush('test-list', 'a');

  assertStrictEq(await redis.llen('test-list'), 3);
});

test(async function ltrim() {
  for (const tc of [
    {
      given: { start: 0, stop: 0 },
      expected: ['one'],
      should: 'return a trimmed array'
    },
    {
      given: { start: 0, stop: 1 },
      expected: ['one', 'two'],
      should: 'return a trimmed array'
    },
    {
      given: { start: 1, stop: -1 },
      expected: ['two', 'three'],
      should: 'return a trimmed array'
    },
    {
      given: { start: 2, stop: 1 },
      expected: [],
      should: 'return an empty array if `stop` is greater than `start`'
    },
    {
      given: { start: 3, stop: 5 },
      expected: [],
      should: 'return an empty array if indexes are out of range'
    }
  ]) {
    const redis = createMockRedis();
    await redis.rpush('mylist', 'one');
    await redis.rpush('mylist', 'two');
    await redis.rpush('mylist', 'three');

    assertStrictEq(await redis.ltrim('mylist', tc.given.start, tc.given.stop), 'OK');

    const actual = await redis.lrange('mylist', 0, -1);
    const msg = `Given ${tc.given.start} and ${tc.given.stop}: should ${tc.should}`;

    assertEquals(actual, tc.expected, msg);
  }
});

test(async function linsertBeforePivot() {

  {
    const redis = createMockRedis();
    await redis.rpush('mylist', 'Hello');
    await redis.rpush('mylist', 'World');
    assertStrictEq(await redis.linsert('mylist', 'BEFORE', 'World', 'There'), 3);
    assertEquals(await redis.lrange('mylist', 0, -1), ['Hello', 'There', 'World']);
  }

  {
    const redis = createMockRedis();
    await redis.rpush('mylist', 'one');
    await redis.rpush('mylist', 'two');
    assertStrictEq(await redis.linsert('mylist', 'BEFORE', 'one', 'zero'), 3);
    assertEquals(await redis.lrange('mylist', 0, -1), ['zero', 'one', 'two']);
  }
});

test(async function linsertAfterPivot() {
  {
    const redis = createMockRedis();
    await redis.rpush('mylist', 'one');
    await redis.rpush('mylist', 'two');
    assertStrictEq(await redis.linsert('mylist', 'AFTER', 'two', 'three'), 3);
    assertEquals(await redis.lrange('mylist', 0, -1), ['one', 'two', 'three']);
  }

  {
    const redis = createMockRedis();
    await redis.rpush('mylist', 'one');
    await redis.rpush('mylist', 'two');
    await redis.rpush('mylist', 'two');
    assertStrictEq(await redis.linsert('mylist', 'AFTER', 'two', 'three'), 4);
    assertEquals(await redis.lrange('mylist', 0, -1), ['one', 'two', 'three', 'two']);
  }
});

test(async function linsertWhenPivotDoesNotExist() {
  const redis = createMockRedis();
  await redis.rpush('mylist', 'one');
  await redis.rpush('mylist', 'two');
  assertStrictEq(await redis.linsert('mylist', 'BEFORE', 'four', 'three'), -1);
  assertStrictEq(await redis.linsert('mylist', 'AFTER', 'three', 'four'), -1);
  assertEquals(await redis.lrange('mylist', 0, -1), ['one', 'two']);
});

runIfMain(import.meta);
