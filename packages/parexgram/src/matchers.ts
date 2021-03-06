import { eatFeed, Feed, lookFeed } from './feed';

export interface MatchResult<T> {
  value: T;
  start: number;
  end: number;
}

export type Matcher<T> = (feed: Feed) => MatchResult<T> | null | undefined;

export function alternation<T extends Matcher<R>[], R>(
  ...matchers: T
): Matcher<R> {
  return (feed) => {
    for (let i = 0, len = matchers.length; i < len; i += 1) {
      const result = matchers[i](feed);

      if (result != null) {
        return result;
      }
    }
    return null;
  };
}

export function sequence<T extends Matcher<R>[], R>(
  ...matchers: T
): Matcher<MatchResult<R>[]> {
  return (feed) => {
    const results: MatchResult<R>[] = [];
    const { cursor } = feed;
    for (let i = 0, len = matchers.length; i < len; i += 1) {
      const result = matchers[i](feed);

      if (result != null) {
        results.push(result);
      } else {
        feed.cursor = cursor;
        return null;
      }
    }
    return {
      value: results,
      start: cursor,
      end: feed.cursor,
    };
  };
}

export function pattern(value: string): Matcher<string> {
  const regexp = new RegExp(`^${value}`);
  return (feed) => {
    const peeked = lookFeed(feed);
    if (regexp.test(peeked)) {
      const match = regexp.exec(peeked);
      const { cursor } = feed;
      if (match != null && eatFeed(feed, match[0])) {
        return {
          value: match[0],
          start: cursor,
          end: feed.cursor,
        };
      }
    }
    return null;
  };
}

export function character(value: string): Matcher<string> {
  return (feed) => {
    const { cursor } = feed;
    if (eatFeed(feed, value, 1)) {
      return {
        value,
        start: cursor,
        end: feed.cursor,
      };
    }
    return null;
  };
}

export function quantifier<T>(
  matcher: Matcher<T>,
  min = 0,
  max: number | undefined = undefined,
): Matcher<MatchResult<T>[]> {
  return (feed) => {
    const results: MatchResult<T>[] = [];
    const { cursor } = feed;
    let count = 0;
    while (true) {
      if (max != null && count >= max) {
        break;
      }
      const parsed = matcher(feed);
      if (!parsed) {
        break;
      }
      results.push(parsed);
      count += 1;
    }
    if (count >= min) {
      return {
        value: results,
        start: cursor,
        end: feed.cursor,
      };
    }
    feed.cursor = cursor;
    return null;
  };
}

export function optional<T>(matcher: Matcher<T>): Matcher<MatchResult<T> | null> {
  return (feed) => {
    const { cursor } = feed;
    const result = matcher(feed);
    if (result) {
      feed.cursor = cursor;
    }
    return {
      value: result ?? null,
      start: cursor,
      end: feed.cursor,
    };
  };
}
