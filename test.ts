import { runTests } from './vendor/https/deno.land/std/testing/mod.ts';

import './tests/keys_methods_test.ts';
import './tests/string_methods_test.ts';
import './tests/list_methods_test.ts';
import './tests/set_methods_test.ts';
import './tests/hash_methods_test.ts';

runTests();
