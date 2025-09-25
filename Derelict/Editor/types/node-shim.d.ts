declare module 'node:fs' {
  export function readdirSync(
    path: string | URL,
    options?: { encoding?: BufferEncoding | null } | BufferEncoding | null,
  ): string[];
}

declare module 'node:path' {
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}

declare module 'node:test' {
  export function test(
    name: string,
    fn: () => void | Promise<void>,
  ): void;
}

declare module 'node:assert/strict' {
  const assert: {
    (value: unknown, message?: string | Error): asserts value;
    ok(value: unknown, message?: string | Error): asserts value;
    deepEqual(actual: unknown, expected: unknown, message?: string | Error): void;
  };
  export default assert;
}
