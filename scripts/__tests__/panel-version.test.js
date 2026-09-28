const { describe: versionOf, readVersion } = require('../panel-version');

const AT = '2026-09-28T12:00:00.000Z';

describe('the panel version', () => {
  test('a tagged commit is its tag', () => {
    const v = versionOf({ tag: 'panel-2026.09.28', exact: true, commit: '3da6acb', dirty: false, builtAt: AT });
    expect(v.label).toBe('panel-2026.09.28');
    expect(v.id).toBe('3da6acb');
  });

  test('between tags, the last tag and the commit', () => {
    const v = versionOf({ tag: 'panel-2026.09.28', exact: false, commit: '0158f10', dirty: false, builtAt: AT });
    expect(v.label).toBe('panel-2026.09.28 · 0158f10');
  });

  test('with no tag yet, the commit', () => {
    expect(versionOf({ tag: null, exact: false, commit: '3da6acb', dirty: false, builtAt: AT }).label).toBe('3da6acb');
  });

  test('local changes make every build its own', () => {
    const v = versionOf({ tag: null, exact: false, commit: '3da6acb', dirty: true, builtAt: AT });
    expect(v.dirty).toBe(true);
    expect(v.id).toBe(`3da6acb+${AT}`);
  });

  test('read from this repository: a commit, never an upstream v1.x tag', () => {
    const v = readVersion(process.cwd(), '1.11.5');
    expect(v.commit).toMatch(/^[0-9a-f]{7}$/);
    expect(v.label).not.toMatch(/^v1\./);
  });

  test('with no git to ask, the package version', () => {
    const v = readVersion('/', '1.11.5');
    expect(v.label).toBe('1.11.5');
  });
});
