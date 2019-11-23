import { runIfMain, test } from '../vendor/https/deno.land/std/testing/mod.ts';
import { assertEquals, assertStrictEq, assertArrayContains } from '../vendor/https/deno.land/std/testing/asserts.ts';
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

test(async function scard() {
  {
    const redis = new RedisMock();
    await redis.sadd('myset', "Hello");
    await redis.sadd('myset', "World");
    assertStrictEq(await redis.scard('myset'), 2);
  }

  {
    const redis = new RedisMock();
    assertStrictEq(await redis.scard('nosuchkey'), 0, 'should return zero if a key does not exist');
    assertStrictEq(await redis.exists('nosuchkey'), 0, 'should not create a new key');
  }
});

test(async function smembers() {
  {
    const redis = new RedisMock();
    await redis.sadd('myset', 'Hello');
    await redis.sadd('myset', 'World');
    assertArrayContains(await redis.smembers('myset'), ['Hello', 'World']);
  }

  {
    const redis = new RedisMock();
    assertEquals(await redis.smembers('nosuchkey'), [], 'should return an empty array if a key does not exist');
    assertStrictEq(await redis.exists('nosuchkey'), 0, 'should not create a new key');
  }
});

runIfMain(import.meta);
