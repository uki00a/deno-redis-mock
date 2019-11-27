import { runIfMain, test } from '../vendor/https/deno.land/std/testing/mod.ts';
import { assertStrictEq } from '../vendor/https/deno.land/std/testing/asserts.ts';
import { createMockRedis } from '../mod.ts';


test(async function get() {
  const redis = createMockRedis({
    data: {
      'test': 'hello'
    }
  });

  for (const tc of [
    { given: 'test', expected: 'hello' },
    { given: 'non_existing_key', expected: undefined }
  ]) {
    const { given, expected } = tc;
    const actual = await redis.get(given);
    assertStrictEq(actual, expected);
  }
});

runIfMain(import.meta);
