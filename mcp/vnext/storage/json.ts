class JsonIntegrityError extends Error {}

function propertyPath(path: string, key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;
}

function fail(path: string, message: string): never {
  throw new JsonIntegrityError(`${path}: ${message}`);
}

function validateDenseArray(value: unknown[], path: string, ancestors: WeakSet<object>): void {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    fail(path, "expected a plain array without a custom prototype");
  }
  if (ancestors.has(value)) fail(path, "cyclic values are not JSON-safe");

  ancestors.add(value);
  try {
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol") fail(path, "symbol keys are not JSON-safe");
      if (key === "length") continue;
      if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length) {
        fail(propertyPath(path, key), "extra array properties are not JSON-safe");
      }
    }

    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) {
        fail(`${path}[${index}]`, "sparse arrays are not JSON-safe");
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        fail(`${path}[${index}]`, "array entries must be enumerable data properties");
      }
      validateJsonValue(descriptor.value, `${path}[${index}]`, ancestors);
    }
  } finally {
    ancestors.delete(value);
  }
}

function validatePlainObject(
  value: Record<string | symbol, unknown>,
  path: string,
  ancestors: WeakSet<object>,
): void {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(path, "expected a plain object without inherited application data");
  }
  if (ancestors.has(value)) fail(path, "cyclic values are not JSON-safe");

  ancestors.add(value);
  try {
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol") fail(path, "symbol keys are not JSON-safe");
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        fail(propertyPath(path, key), "object entries must be enumerable data properties");
      }
      validateJsonValue(descriptor.value, propertyPath(path, key), ancestors);
    }
  } finally {
    ancestors.delete(value);
  }
}

function validateJsonValue(value: unknown, path: string, ancestors: WeakSet<object>): void {
  if (value === null || typeof value === "boolean" || typeof value === "string") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(path, "numbers must be finite");
    return;
  }
  if (Array.isArray(value)) {
    validateDenseArray(value, path, ancestors);
    return;
  }
  if (typeof value === "object") {
    validatePlainObject(value as Record<string | symbol, unknown>, path, ancestors);
    return;
  }

  fail(path, `${typeof value} values are not JSON-safe`);
}

function validateObjectRoot(value: unknown): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("$", "expected an object root");
  }
  validatePlainObject(value as Record<string | symbol, unknown>, "$", new WeakSet<object>());
}

function validateStringArrayRoot(value: unknown): asserts value is string[] {
  if (!Array.isArray(value)) fail("$", "expected a dense string array root");
  validateDenseArray(value, "$", new WeakSet<object>());
  for (let index = 0; index < value.length; index += 1) {
    if (typeof value[index] !== "string") fail(`$[${index}]`, "expected a string");
  }
}

function parseJson(json: string, context: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch (error) {
    throw new Error(
      `Corrupt ${context}: invalid JSON${error instanceof Error ? ` (${error.message})` : ""}.`,
    );
  }
}

export function stringifyJsonObject(value: unknown, context: string): string {
  try {
    validateObjectRoot(value);
  } catch (error) {
    if (error instanceof JsonIntegrityError) throw new Error(`Invalid ${context}: ${error.message}.`);
    throw error;
  }
  return JSON.stringify(value);
}

export function parseJsonObject(json: string, context: string): Record<string, unknown> {
  const value = parseJson(json, context);
  try {
    validateObjectRoot(value);
  } catch (error) {
    if (error instanceof JsonIntegrityError) throw new Error(`Corrupt ${context}: ${error.message}.`);
    throw error;
  }
  return value;
}

export function stringifyJsonStringArray(value: unknown, context: string): string {
  try {
    validateStringArrayRoot(value);
  } catch (error) {
    if (error instanceof JsonIntegrityError) throw new Error(`Invalid ${context}: ${error.message}.`);
    throw error;
  }
  return JSON.stringify(value);
}

export function parseJsonStringArray(json: string, context: string): string[] {
  const value = parseJson(json, context);
  try {
    validateStringArrayRoot(value);
  } catch (error) {
    if (error instanceof JsonIntegrityError) throw new Error(`Corrupt ${context}: ${error.message}.`);
    throw error;
  }
  return value;
}
