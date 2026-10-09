// Pure license policy evaluation for scripts/check-licenses.mjs.
//
// `report` has the shape printed by `pnpm licenses list --json`:
//   { "<license expression>": [{ name, versions: [...], license, ... }], ... }
// `policy` is the content of licenses.allow.json.

const PASSING = new Set(['allowed', 'exception', 'skipped']);

// Lower rank is better. AND takes the worst part, OR takes the best option.
const RANK = { allowed: 0, 'data-only': 1, review: 1, unlisted: 2, denied: 3 };

const UNKNOWN = /^(unknown|none|)$|^see licen[cs]e in /i;

/**
 * @param {Record<string, Array<{ name: string, versions?: string[], version?: string }>>} report
 * @param {object} policy
 * @param {{ production?: Iterable<string> }} [options]
 */
export function evaluateLicenses(report, policy, options = {}) {
  const exceptions = policy.exceptions ?? {};
  for (const [name, exception] of Object.entries(exceptions)) {
    if (typeof exception?.reason !== 'string' || exception.reason.trim() === '') {
      throw new Error(`License exception for "${name}" needs a reason`);
    }
    if (typeof exception.license !== 'string') {
      throw new Error(`License exception for "${name}" needs the license it was granted for`);
    }
  }

  const ignore = (policy.ignore ?? []).map(globToRegExp);
  const denied = (policy.denied ?? []).map(globToRegExp);
  const lists = {
    allowed: lowerSet(policy.allowed),
    'data-only': lowerSet(policy.dataOnly),
    review: lowerSet(policy.review),
  };
  const production = new Set(options.production ?? []);
  const usedExceptions = new Set();

  const classifyId = (id) => {
    if (denied.some((re) => re.test(id))) return 'denied';
    const key = id.toLowerCase();
    for (const [status, set] of Object.entries(lists)) if (set.has(key)) return status;
    return 'unlisted';
  };

  const results = [];
  for (const [reportedLicense, packages] of Object.entries(report)) {
    for (const pkg of packages) {
      const license = (pkg.license ?? reportedLicense ?? '').trim();
      const row = {
        name: pkg.name,
        version: (pkg.versions ?? [pkg.version]).filter(Boolean).join(', '),
        license,
        status: '',
        detail: '',
      };
      results.push(row);

      if (ignore.some((re) => re.test(pkg.name))) {
        row.status = 'skipped';
        row.detail = 'workspace package';
        continue;
      }

      const exception = Object.hasOwn(exceptions, pkg.name) ? exceptions[pkg.name] : undefined;
      if (exception) {
        usedExceptions.add(pkg.name);
        if (exception.license.trim() !== license) {
          row.status = 'exception-mismatch';
          row.detail = `exception was granted for "${exception.license}"; review it again`;
        } else if (exception.devOnly && production.has(pkg.name)) {
          row.status = 'exception-not-dev-only';
          row.detail = 'exception is dev-only but the package is a production dependency';
        } else {
          row.status = 'exception';
          row.detail = exception.reason.trim();
        }
        continue;
      }

      row.status = classifyExpression(license, classifyId);
      row.detail = DETAILS[row.status] ?? '';
    }
  }

  const failing = (r) => !PASSING.has(r.status);
  results.sort(
    (a, b) =>
      Number(failing(b)) - Number(failing(a)) ||
      a.name.localeCompare(b.name) ||
      a.version.localeCompare(b.version),
  );

  const failures = results.filter(failing);
  return {
    ok: failures.length === 0,
    results,
    failures,
    unusedExceptions: Object.keys(exceptions)
      .filter((name) => !usedExceptions.has(name))
      .sort(),
  };
}

const DETAILS = {
  denied: 'license is on the deny list',
  review: 'copyleft license: needs a reviewed exception',
  'data-only': 'allowed for fonts and data only: needs a reviewed exception',
  unlisted: 'license is not in licenses.allow.json',
  unknown: 'no usable license declared',
};

/**
 * Classifies an SPDX expression. Returns 'unknown' when there is no usable
 * license or the expression cannot be parsed.
 */
function classifyExpression(expression, classifyId) {
  if (UNKNOWN.test(expression)) return 'unknown';
  let tokens;
  try {
    tokens = tokenize(expression);
  } catch {
    return 'unknown';
  }
  let pos = 0;

  // expr := term (OR term)* ; term := factor (AND factor)* ; factor := id | '(' expr ')'
  const parseExpr = () => {
    let best = parseTerm();
    while (tokens[pos] === 'OR') {
      pos += 1;
      const next = parseTerm();
      if (RANK[next] < RANK[best]) best = next;
    }
    return best;
  };
  const parseTerm = () => {
    let worst = parseFactor();
    while (tokens[pos] === 'AND') {
      pos += 1;
      const next = parseFactor();
      if (RANK[next] > RANK[worst]) worst = next;
    }
    return worst;
  };
  const parseFactor = () => {
    const token = tokens[pos];
    if (token === '(') {
      pos += 1;
      const inner = parseExpr();
      if (tokens[pos] !== ')') throw new SyntaxError('missing )');
      pos += 1;
      return inner;
    }
    if (token === undefined || token === ')' || token === 'AND' || token === 'OR') {
      throw new SyntaxError(`unexpected ${token ?? 'end of expression'}`);
    }
    pos += 1;
    if (UNKNOWN.test(token)) return 'unlisted';
    return classifyId(token);
  };

  try {
    const status = parseExpr();
    if (pos !== tokens.length) return 'unknown';
    return status;
  } catch {
    return 'unknown';
  }
}

/** Splits an SPDX expression into ids, parentheses and operators. "X WITH Y" stays one id. */
function tokenize(expression) {
  const raw = expression.match(/\(|\)|[^\s()]+/g) ?? [];
  const tokens = [];
  for (let i = 0; i < raw.length; i += 1) {
    const upper = raw[i].toUpperCase();
    if (upper === 'AND' || upper === 'OR') tokens.push(upper);
    else if (upper === 'WITH') {
      const previous = tokens.pop();
      const next = raw[i + 1];
      if (!previous || !next || ['(', ')', 'AND', 'OR'].includes(previous)) {
        throw new SyntaxError('dangling WITH');
      }
      tokens.push(`${previous} WITH ${next}`);
      i += 1;
    } else tokens.push(raw[i]);
  }
  return tokens;
}

function lowerSet(values = []) {
  return new Set(values.map((v) => v.toLowerCase()));
}

function globToRegExp(glob) {
  const source = glob
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${source}$`, 'i');
}

/** Renders result rows as a plain-text table. */
export function formatTable(rows) {
  const columns = [
    ['Package', 'name'],
    ['Version', 'version'],
    ['License', 'license'],
    ['Status', 'status'],
    ['Detail', 'detail'],
  ];
  const widths = columns.map(([title, key]) =>
    Math.max(title.length, ...rows.map((row) => String(row[key] ?? '').length)),
  );
  const line = (cells) =>
    cells
      .map((cell, i) => (i === cells.length - 1 ? cell : cell.padEnd(widths[i])))
      .join('  ')
      .trimEnd();
  return [
    line(columns.map(([title]) => title)),
    line(widths.map((w) => '-'.repeat(w))),
    ...rows.map((row) => line(columns.map(([, key]) => String(row[key] ?? '')))),
  ].join('\n');
}
