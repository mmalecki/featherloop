import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { LANGUAGES, rustTests, type Case } from './harness-bench/cases.ts';

describe('rust', () => {
  const rust = LANGUAGES.rust;

  test('sums the passes of every test binary', () => {
    const output = `   Compiling forth v1.7.0 (/tmp/bench-x/forth)
    Finished \`test\` profile [unoptimized + debuginfo] target(s) in 0.90s
     Running tests/alloc-attack.rs (target/debug/deps/alloc_attack-4d41)

running 1 test
test alloc_attack ... FAILED

failures:

---- alloc_attack stdout ----
assertion failed

test result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.01s

     Running tests/forth.rs (target/debug/deps/forth-740b)

running 49 tests
test result: FAILED. 47 passed; 2 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.02s

error: 2 targets failed:
    \`--test alloc-attack\`
    \`--test forth\`
`;
    assert.equal(rust.passed(output), 47);
  });

  test("counts nothing when the tests don't compile", () => {
    const output = `   Compiling wordy v1.5.0 (/tmp/bench-x/wordy)
error[E0425]: cannot find function \`answer\` in crate \`wordy\`
 --> tests/wordy.rs:4:24
error: could not compile \`wordy\` (test "wordy") due to 1 previous error
`;
    assert.equal(rust.passed(output), 0);
  });

  test("doesn't take a test named like a result line for one", () => {
    assert.equal(rust.passed('test test_result_ok_5_passed ... ok\ntest result: ok. 1 passed; 0 failed; 0 ignored\n'), 1);
  });

  test('runs the shipped test targets, ignored tests included, past a failing one', () => {
    const c = { tests: ['tests/doubly-linked-list.rs', 'tests/step_4_leak_test_1.rs'] } as Case;
    assert.deepEqual(rust.testCommand(c), [
      'cargo',
      'test',
      '--no-fail-fast',
      '--test',
      'doubly-linked-list',
      '--test',
      'step_4_leak_test_1',
      '--',
      '--include-ignored',
    ]);
  });

  test('counts tests, ignored or not', () => {
    assert.equal(rustTests('#[test]\nfn a() {}\n\n#[test]\n#[ignore]\nfn b() {\n    assert!(true);\n}\n'), 2);
  });

  test('leaves out tests a feature gates, on the test or a module around it', () => {
    const source = `#[cfg(feature = "io")]
use std::io::{Read, Write};

#[test]
fn plain() {}

#[test]
#[ignore]
#[cfg(feature = "exponentials")]
fn exponential() {}

mod nested {
    #[test]
    fn counted() {
        let s = "}";
        let c = '}';
    }

    #[cfg(feature = "io")]
    mod io {
        #[test]
        fn reader() {}
        mod deeper {
            #[test]
            fn writer() {}
        }
    }

    #[test]
    fn after() {}
}
`;
    assert.equal(rustTests(source), 3);
  });

  test('sees through braces in comments and raw strings', () => {
    assert.equal(rustTests('// {\n/* } */\n#[test]\nfn a() {\n    let s = r#"}"#;\n}\n#[test]\nfn b() {}\n'), 2);
  });
});
