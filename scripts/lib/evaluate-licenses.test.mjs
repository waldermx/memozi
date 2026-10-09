import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { evaluateLicenses, formatTable } from './evaluate-licenses.mjs';

const policy = {
  ignore: ['@memozi/*', 'memozi'],
  allowed: ['MIT', 'ISC', 'BSD-3-Clause', 'Apache-2.0'],
  dataOnly: ['CC-BY-4.0', 'OFL-1.1'],
  review: ['LGPL-3.0-or-later', 'CC-BY-SA-4.0'],
  denied: ['GPL-2.0-only', 'SSPL-1.0', 'CC-BY-NC-*', 'UNLICENSED'],
  exceptions: {},
};

const pkg = (name, license, version = '1.0.0') => ({ name, versions: [version], license });

/** Builds a report shaped like `pnpm licenses list --json`. */
const report = (...pkgs) => {
  const out = {};
  for (const p of pkgs) (out[p.license] ??= []).push(p);
  return out;
};

const statusOf = (result, name) => result.results.find((r) => r.name === name)?.status;

describe('evaluateLicenses', () => {
  it('passes when every package uses an allowed license', () => {
    const result = evaluateLicenses(report(pkg('a', 'MIT'), pkg('b', 'ISC')), policy);
    assert.equal(result.ok, true);
    assert.deepEqual(result.failures, []);
    assert.equal(statusOf(result, 'a'), 'allowed');
  });

  it('fails on a denied license', () => {
    const result = evaluateLicenses(report(pkg('evil', 'SSPL-1.0')), policy);
    assert.equal(result.ok, false);
    assert.equal(statusOf(result, 'evil'), 'denied');
  });

  it('matches denied ids with wildcards', () => {
    const result = evaluateLicenses(report(pkg('nc', 'CC-BY-NC-4.0')), policy);
    assert.equal(statusOf(result, 'nc'), 'denied');
  });

  it('compares SPDX ids case-insensitively', () => {
    const result = evaluateLicenses(report(pkg('a', 'mit'), pkg('b', 'apache-2.0')), policy);
    assert.equal(result.ok, true);
  });

  it('fails on review-only licenses without an exception', () => {
    const result = evaluateLicenses(report(pkg('lgpl', 'LGPL-3.0-or-later')), policy);
    assert.equal(result.ok, false);
    assert.equal(statusOf(result, 'lgpl'), 'review');
  });

  it('fails on data-only licenses without an exception', () => {
    const result = evaluateLicenses(report(pkg('caniuse-lite', 'CC-BY-4.0')), policy);
    assert.equal(result.ok, false);
    assert.equal(statusOf(result, 'caniuse-lite'), 'data-only');
  });

  it('fails on licenses that are not in any list', () => {
    const result = evaluateLicenses(report(pkg('odd', 'WTFPL')), policy);
    assert.equal(result.ok, false);
    assert.equal(statusOf(result, 'odd'), 'unlisted');
  });

  for (const license of ['Unknown', 'UNKNOWN', '', 'SEE LICENSE IN LICENSE.txt']) {
    it(`treats ${JSON.stringify(license)} as unknown`, () => {
      const result = evaluateLicenses(report(pkg('mystery', license)), policy);
      assert.equal(result.ok, false);
      assert.equal(statusOf(result, 'mystery'), 'unknown');
    });
  }

  it('denies UNLICENSED third-party packages', () => {
    const result = evaluateLicenses(report(pkg('closed', 'UNLICENSED')), policy);
    assert.equal(statusOf(result, 'closed'), 'denied');
  });

  describe('SPDX expressions', () => {
    it('passes an OR expression when any option is allowed', () => {
      const result = evaluateLicenses(report(pkg('dual', '(AFL-2.1 OR BSD-3-Clause)')), policy);
      assert.equal(statusOf(result, 'dual'), 'allowed');
    });

    it('fails an OR expression when no option is allowed', () => {
      const result = evaluateLicenses(report(pkg('dual', 'GPL-2.0-only OR SSPL-1.0')), policy);
      assert.equal(statusOf(result, 'dual'), 'denied');
    });

    it('takes the best option of an OR expression', () => {
      const result = evaluateLicenses(report(pkg('dual', 'GPL-2.0-only OR CC-BY-SA-4.0')), policy);
      assert.equal(statusOf(result, 'dual'), 'review');
    });

    it('requires every part of an AND expression to be allowed', () => {
      const ok = evaluateLicenses(report(pkg('both', '(MIT AND ISC)')), policy);
      assert.equal(statusOf(ok, 'both'), 'allowed');
      const bad = evaluateLicenses(report(pkg('both', 'MIT AND GPL-2.0-only')), policy);
      assert.equal(statusOf(bad, 'both'), 'denied');
    });

    it('handles nested parentheses', () => {
      const result = evaluateLicenses(
        report(pkg('nested', '(MIT AND (GPL-2.0-only OR Apache-2.0))')),
        policy,
      );
      assert.equal(statusOf(result, 'nested'), 'allowed');
    });

    it('treats a malformed expression as unknown', () => {
      const result = evaluateLicenses(report(pkg('broken', '(MIT OR')), policy);
      assert.equal(statusOf(result, 'broken'), 'unknown');
    });
  });

  describe('workspace packages', () => {
    it('skips packages matched by the ignore list', () => {
      const result = evaluateLicenses(
        report(pkg('@memozi/shared', 'Unknown'), pkg('memozi', 'AGPL-3.0-or-later')),
        policy,
      );
      assert.equal(result.ok, true);
      assert.equal(statusOf(result, '@memozi/shared'), 'skipped');
      assert.equal(statusOf(result, 'memozi'), 'skipped');
    });
  });

  describe('exceptions', () => {
    const withException = (exceptions) => ({ ...policy, exceptions });

    it('accepts a package with a matching exception', () => {
      const result = evaluateLicenses(
        report(pkg('caniuse-lite', 'CC-BY-4.0')),
        withException({
          'caniuse-lite': { license: 'CC-BY-4.0', reason: 'Build-time browser data.' },
        }),
      );
      assert.equal(result.ok, true);
      const row = result.results.find((r) => r.name === 'caniuse-lite');
      assert.equal(row.status, 'exception');
      assert.equal(row.detail, 'Build-time browser data.');
    });

    it('records an exception even when the license would pass on its own', () => {
      const result = evaluateLicenses(
        report(pkg('json-schema', '(AFL-2.1 OR BSD-3-Clause)')),
        withException({
          'json-schema': { license: '(AFL-2.1 OR BSD-3-Clause)', reason: 'We take BSD-3-Clause.' },
        }),
      );
      assert.equal(statusOf(result, 'json-schema'), 'exception');
    });

    it('fails when the package license no longer matches the exception', () => {
      const result = evaluateLicenses(
        report(pkg('caniuse-lite', 'CC-BY-SA-4.0')),
        withException({ 'caniuse-lite': { license: 'CC-BY-4.0', reason: 'Data.' } }),
      );
      assert.equal(result.ok, false);
      assert.equal(statusOf(result, 'caniuse-lite'), 'exception-mismatch');
    });

    it('fails a dev-only exception when the package ships in production', () => {
      const exceptions = {
        'caniuse-lite': { license: 'CC-BY-4.0', reason: 'Data.', devOnly: true },
      };
      const result = evaluateLicenses(
        report(pkg('caniuse-lite', 'CC-BY-4.0')),
        withException(exceptions),
        { production: ['caniuse-lite'] },
      );
      assert.equal(result.ok, false);
      assert.equal(statusOf(result, 'caniuse-lite'), 'exception-not-dev-only');

      const devOnly = evaluateLicenses(
        report(pkg('caniuse-lite', 'CC-BY-4.0')),
        withException(exceptions),
        { production: new Set(['react']) },
      );
      assert.equal(devOnly.ok, true);
    });

    it('lists exceptions that match no package', () => {
      const result = evaluateLicenses(
        report(pkg('a', 'MIT')),
        withException({ gone: { license: 'MIT', reason: 'Old.' } }),
      );
      assert.equal(result.ok, true);
      assert.deepEqual(result.unusedExceptions, ['gone']);
    });

    it('rejects an exception without a reason', () => {
      assert.throws(
        () =>
          evaluateLicenses(
            report(pkg('a', 'WTFPL')),
            withException({ a: { license: 'WTFPL', reason: ' ' } }),
          ),
        /reason/,
      );
    });
  });

  it('reports one row per package and sorts failures first', () => {
    const result = evaluateLicenses(
      report(pkg('z-ok', 'MIT'), pkg('a-bad', 'SSPL-1.0'), pkg('m-ok', 'ISC', '2.0.0')),
      policy,
    );
    assert.equal(result.results.length, 3);
    assert.equal(result.results[0].name, 'a-bad');
    assert.deepEqual(
      result.failures.map((r) => r.name),
      ['a-bad'],
    );
    assert.equal(result.results.find((r) => r.name === 'm-ok').version, '2.0.0');
  });
});

describe('formatTable', () => {
  it('renders aligned columns with a header', () => {
    const table = formatTable([
      { name: 'a-bad', version: '1.0.0', license: 'SSPL-1.0', status: 'denied', detail: '' },
      { name: 'b', version: '10.2.3', license: 'WTFPL', status: 'unlisted', detail: '' },
    ]);
    const lines = table.split('\n');
    assert.match(lines[0], /^Package\s+Version\s+License\s+Status/);
    assert.match(lines[1], /^-+/);
    assert.equal(lines.length, 4);
    assert.equal(lines[2].indexOf('1.0.0'), lines[3].indexOf('10.2.3'));
  });
});
