import { runIfMain, test } from '../vendor/https/deno.land/std/testing/mod.ts';
import { assertStrictEq } from '../vendor/https/deno.land/std/testing/asserts.ts';
import { RedisMock } from '../mod.ts';

test(async function sismember() {
  const redis = new RedisMock();

  await redis.sadd('hoge', 'hoge');
  await redis.sadd('hoge', 'piyo');

  assertStrictEq(await redis.sismember('hoge', 'hoge'), 1);
  assertStrictEq(await redis.sismember('hoge', 'piyo'), 1);
  assertStrictEq(await redis.sismember('hoge', 'fuga'), 0);

  assertStrictEq(await redis.sismember('piyo', 'hoge'), 0);
});

runIfMain(import.meta);
