import { runTests, test } from './vendor/https/deno.land/std/testing/mod.ts';
import { assertStrictEq } from './vendor/https/deno.land/std/testing/asserts.ts';
import { RedisMock } from './mod.ts';

import './tests/string_methods_test.ts';
import './tests/list_methods_test.ts';
import './tests/set_methods_test.ts';

test(async function exists() {
  const redis = new RedisMock();
  // TODO replace with `SET`
  await redis.lpush('key1', 'Hello');

  assertStrictEq(await redis.exists('key1'), 1);
  assertStrictEq(await redis.exists('nosuchkey'), 0);

  await redis.lpush('key2', 'World');

  assertStrictEq(await redis.exists('key1', 'key2', 'nosuchkey'), 2);
});

runTests();
