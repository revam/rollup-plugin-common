import MagicString from "magic-string";
import { TransformHook, TransformSourceDescription } from "rollup";
import { createFilter } from "rollup-pluginutils";

/**
 * Options for string-replacement.
 *
 * @public
 */
export interface ReplaceOptions {
  /**
   * A minimatch pattern, or an array of minimatch patterns, relative to
   * `process.cwd()` to transform.
   */
  include?: string | string[];
  /**
   * A minimatch pattern, or an array of minimatch patterns, relative to
   * `process.cwd()` to exclude from transformation.
   */
  exclude?: string | string[];
  /**
   * Patterns to use. See {@link ReplacePattern}.
   */
  patterns?: ReplacePattern[];
  /**
   * Shortcut creation of simple patterns without filter.
   */
  simple?: Record<string, string>;
}

export default function replaceFactory(options: ReplaceOptions, verbose?: boolean): TransformHook {
  const filter = createFilter(options.include, options.exclude);
  const patterns = [...parsePatterns(options.patterns), ...parseSimplePatterns(options.simple)];
  return async function transform(code, id): Promise<TransformSourceDescription | undefined> {
    if (!filter(id)) {
      if (verbose) {
        console.log("skipped transform for id %s", id); // tslint:disable-line:no-console
      }
      return undefined;
    }
    if (!patterns.length) {
      if (verbose) {
        console.log("ignored transform for id %s", id); // tslint:disable-line:no-console
      }
      return undefined;
    }
    const magic = new MagicString(code);
    let hasReplacements = false;
    for (const pattern of patterns) {
      // Filter pattern by id
      if (!pattern.filter(id)) {
        if (verbose) {
          console.log("skipped pattern for id %s", id); // tslint:disable-line:no-console
        }
        continue;
      }
      let match = pattern.regex.exec(code);
      while (match) {
        const start = match.index;
        const end = start + match[0].length;
        let result: string | undefined;
        hasReplacements = true;
        if (pattern.type === "simple") {
          // Fill capture groups
          result = pattern.replace.replace(/\$\$|\$&|\$`|\$'|\$\d+/g, (m) => {
            switch (m) {
              case "$$":
                return "$";
              case "$&":
                return match![0];
              case "$`":
                return code.slice(0, start);
              case "$'":
                return code.slice(end);
              default:
                const n = +m.slice(1);
                if (n >= 1 && n < match!.length) {
                  return match![n] || "";
                }
                return m;
            }
          });
        }
        else {
          result = pattern.replace(match);
        }
        if (typeof result !== "string") {
          return this.error("replace function should return a string");
        }
        magic.overwrite(start, end, result);
        match = pattern.regex.global ? pattern.regex.exec(code) : null;
      }
    }
    if (hasReplacements) {
      if (verbose) {
        console.log("transformed code for id %s", id); // tslint:disable-line:no-console
      }
      return { code: magic.toString(), map: magic.generateMap({ hires: true }) };
    }
  };
}

function parseSimplePatterns(raw?: Record<string, string>): Pattern[] {
  const array: Pattern[] = [];
  if (raw) {
    for (const [regex, replace] of Object.entries(raw)) {
      array.push(parsePattern({ regex, replace }));
    }
  }
  return array;
}

function parsePatterns(raw: ReplacePattern[] = []): Pattern[] {
  return raw.map(parsePattern);
}

function parseFilter(raw: ReplacePattern["filter"]): Pattern["filter"] {
  // Custom filter
  if (typeof raw === "function") {
    return raw;
  }
  // Exact-match
  if (typeof raw === "string") {
    return (id) => id === raw;
  }
  // Regex filter
  if (raw instanceof RegExp) {
    return (id) => raw.test(id);
  }
  // No filter
  return () => true;
}

const ENDS_WITH_SLASH = /\/[gimsuy]{0,6}$/;

function parsePattern(pattern: ReplacePattern): Pattern | never {
  const filter = parseFilter(pattern.filter);
  if (typeof pattern.regex === "string") {
    let source = pattern.regex;
    let flags = "g";
    if (source.startsWith("/") && ENDS_WITH_SLASH.test(source)) {
      const split = source.split("/");
      flags = split.pop()!;
      source = split.slice(1).join("/");
    }
    pattern.regex = new RegExp(source, flags);
  }
  if (pattern.regex instanceof RegExp) {
    if (typeof pattern.replace === "string") {
      return {
        filter,
        regex: pattern.regex,
        replace: pattern.replace,
        type: "simple",
      };
    }
    if (typeof pattern.replace === "function") {
      return {
        filter,
        regex: pattern.regex,
        replace: pattern.replace,
        type: "advanced",
      };
    }
  }
  throw new TypeError("Invalid pattern.");
}

/**
 * A replace pattern to match against each code chunk.
 *
 * @public
 */
export interface ReplacePattern {
  /**
   * Filter matched chunks, either 1) by id, 2) by regular expression or 3)
   * with a matcher function.
   */
  filter?: string | RegExp | ((id: string) => boolean);
  /**
   * The regular expression to match.
   *
   * @remarks
   *
   * If supplied with a string, then the global flag is set for the used regular
   * expression.
   *
   * @example
   *
   * ```ts
   * // Replace all instances of $test1 with an emptry string
   * const pattern1: ReplacePattern = {
   *   regex: "\\$test1",
   *   replace: "",
   * };
   *
   * // Same as above, but with a pre-create RegExp instance.
   * const pattern2: ReplacePattern = {
   *   regex: /\$test1/g,
   *   replace: "",
   * };
   *
   * // Same as above, using constructor instead.
   * const pattern3: ReplacePattern = {
   *   regex: new RegExp("\\$test1", "g"),
   *   replace: "",
   * };
   * ```
   *
   * @example
   *
   * ```ts
   * // Replace **the first instance** of $test1 with an empty string.
   * const pattern1: ReplacePattern = {
   *   regex: "/\\$test1/",
   *   replace: "",
   * };
   *
   * // Same as above, but with a pre-created RegExp instance.
   * const pattern2: ReplacePattern = {
   *  regex: /\$test1/,
   *  replace: "",
   * };
   *
   * // Same as above, using constructor instead.
   *
   * const pattern3: ReplacePattern = {
   *   regex: new RegExp("\\$test1"),
   *   replace: "",
   * };
   * ```
   */
  regex: string | RegExp;
  /**
   * Replace the matching results with this.
   *
   * @remarks
   *
   * If supplied with a string, then the substitutions listed below are enabled:
   *
   * - $$ - An escaped `$`-character.
   *
   * - $\` - The text preceding the match result.
   *
   * - $' - The text excceding the match result.
   *
   * - $n - Where `n` is the n-th match in the input
   *   {@link ReplacePattern.regex | regular expression}
   *
   * @example
   *
   * Example inspired by MagicString's
   * {@link https://www.npmjs.com/package/magic-string#usage | example}.
   *
   * Source file.
   * ```ts
   * var problems = 99;
   * ```
   *
   * Patterns used.
   * ```ts
   * const patterns: ReplacePattern[] = [
   *   {
   *     regex: "problems = (\\d+)",
   *     replace: "answer = $1",
   *   },
   *   {
   *     regex: "(\\w+) = 99",
   *     replace: "$1 = 42",
   *   },
   *   {
   *     regex: /var (\w+ = \d+)/,
   *     replace: "const $1",
   *   },
   * ];
   * ```
   *
   * Transpiled file.
   * ```ts
   * const answer = 42;
   * ```
   */
  replace: string | ((result: RegExpExecArray) => string);
}

type Pattern = SimplePattern | AdvancedPattern;

interface SimplePattern {
  filter(id: string): boolean;
  type: "simple";
  regex: RegExp;
  replace: string;
}

interface AdvancedPattern {
  filter(id: string): boolean;
  type: "advanced";
  regex: RegExp;
  replace(result: RegExpExecArray): string;
}
