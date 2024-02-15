import NamedError from './NamedError'

const a = typeof (null as unknown)
export const typeGuards = Object.assign(
  Object.create(null) as NonNullable<unknown>,
  {
    bigint: (v): v is bigint => typeof v === 'bigint',
    boolean: (v): v is boolean => typeof v === 'boolean',
    // eslint-disable-next-line @typescript-eslint/ban-types
    function: (v): v is Function => typeof v === 'function',
    number: (v): v is number => typeof v === 'number',
    object: (v): v is object => v != null && typeof v === 'object',
    string: (v): v is string => typeof v === 'string',
    symbol: (v): v is symbol => typeof v === 'symbol',
    undefined: (v): v is undefined => typeof v === 'undefined',
    null: (v): v is null => v === null,
    nullish: (v): v is null => v == null,
  } satisfies {
    [key in typeof a]: (v: unknown) => boolean
  } & {
    [key: string]: (v: unknown) => boolean
  },
)

export type TypeName = keyof typeof typeGuards
export type TypeNameMap = {
  [key in TypeName]: (typeof typeGuards)[key]
}

const UNION = Symbol('union')
const INTERSECTION = Symbol('intersection')

type UnionToIntersection<U> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void
    ? I
    : never

export type TypeDef =
  | TypeName
  | symbol
  | ((
      o: unknown,
      ErrorCtors: ErrorCtors,
      path: PropertyKey[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) => o is any)
  | ((
      o: unknown,
      ErrorCtors: ErrorCtors,
      path: PropertyKey[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) => asserts o is any)
  | readonly [TypeDef]
  | (readonly TypeDef[] & { readonly [UNION]: true })
  | (readonly TypeDef[] & { readonly [INTERSECTION]: true })
  | {
      readonly [key: string]: TypeDef
      readonly [key: number]: TypeDef
      readonly [key: symbol]: TypeDef
    }

export type ResolvedType<Type extends TypeDef> = Type extends
  | ((
      o: unknown,
      ErrorCtor: new (
        path: PropertyKey[],
        expectedType: TypeDef,
        hasValue: boolean,
        value: unknown,
      ) => Error,
      path: PropertyKey[],
    ) => o is infer Q)
  | ((
      o: unknown,
      ErrorCtor: new (
        path: PropertyKey[],
        expectedType: TypeDef,
        hasValue: boolean,
        value: unknown,
      ) => Error,
      path: PropertyKey[],
    ) => asserts o is infer Q)
  ? Q
  : Type extends readonly TypeDef[] & { readonly [UNION]: true }
    ? ResolvedType<Type[number]>
    : Type extends readonly TypeDef[] & { readonly [INTERSECTION]: true }
      ? UnionToIntersection<ResolvedType<Type[number]>>
      : Type extends [infer Q extends TypeDef]
        ? readonly ResolvedType<Q>[]
        : Type extends {
              readonly [key: string]: TypeDef
              readonly [key: symbol]: TypeDef
            }
          ? {
              readonly [key in keyof Type]-?: Type[key] extends TypeDef
                ? ResolvedType<Type[key]>
                : never
            }
          : Type extends TypeName
            ? TypeNameMap[Type] extends (v: unknown) => v is infer Q
              ? Q
              : never
            : Type extends symbol
              ? Type
              : never

export function isValidType(key: unknown): key is TypeName {
  return typeof key === 'string' && key in typeGuards
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isArray(o: unknown): o is readonly any[] | any[] {
  return Array.isArray(o)
}

function objectString(o: object | null): string {
  if (o == null) return 'null'
  if (Array.isArray(o)) {
    if (o.length === 0) return 'array<empty>'
    if (o.length > 1024) return 'array<...>'
    const [first, ...rest] = o
    const firstType = getTypeName(first)
    if (rest.every(t => getTypeName(t) === firstType))
      return `array<${firstType}>`
    return 'array<...>'
  }
  const match = Object.prototype.toString.call(o).match(/\[object (.+)\]/)
  if (!match) return 'object'
  const [, tag] = match
  if (tag !== 'Object') {
    return tag
  }
  const { constructor } = o
  if (
    typeof constructor === 'function' &&
    constructor.name &&
    constructor.name !== 'Object'
  ) {
    return `object(${constructor})`
  }
  return 'object'
}

export function getTypeName(o: unknown) {
  switch (typeof o) {
    case 'bigint':
      return `bigint(${o}n)`
    case 'number':
      return `number(${o})`
    case 'boolean':
      return `boolean(${o})`
    case 'function':
      return 'function(...)'
    case 'object':
      return objectString(o)
    case 'string':
      return `string(${JSON.stringify(o)})`
    case 'symbol':
      return `symbol(${o.description ?? ''})`
    case 'undefined':
      return 'undefined'
  }
}

export function typeMapString(type: TypeDef): string {
  if (typeof type === 'string') return type
  if (typeof type === 'function')
    return `guard${type.name ? `(${type.name})` : ''}`
  if (typeof type === 'symbol') return `symbol(${type.description ?? ''})`
  if (isArray(type)) {
    if (UNION in type && type[UNION] === true) {
      return type.map(typeMapString).join(' | ')
    } else if (INTERSECTION in type && type[INTERSECTION] === true) {
      return type.map(typeMapString).join(' & ')
    }
    return `array<${typeMapString(type[0])}>`
  }
  if (type != null && typeof type === 'object') return 'object'
  return 'INVALID TYPE'
}

function safeName(o: PropertyKey): string {
  if (typeof o === 'string') {
    if (/^[a-zA-Z$_][a-zA-Z0-9$_]*$/.test(o)) return `.${o}`
    return `[${JSON.stringify(o)}]`
  }
  if (typeof o === 'number') return `[${o}]`
  return `[${Symbol.prototype.toString.call(o)}]`
}

function mkPathString(path: PropertyKey[]) {
  return path.map(safeName).join().replace(/^\./, '')
}

export class InvalidValueError extends NamedError {
  static PathString(path: PropertyKey[]) {
    return path.map(safeName).join('').replace(/^\./, '')
  }

  get pathString(): string {
    return mkPathString(this.#path)
  }

  get path(): PropertyKey[] {
    return this.#path
  }

  #path: PropertyKey[]

  constructor(
    path: PropertyKey[],
    expectedValue: string,
    receivedValue?: string,
  ) {
    if (receivedValue) {
      super(
        `Invalid value at ${InvalidValueError.PathString(path)}, expected ${expectedValue}, got ${receivedValue}`,
      )
    } else {
      super(`Missing property ${mkPathString(path)}, expected ${expectedValue}`)
      console.log(this.stack)
    }
    this.#path = path
  }
}

export class InvalidTypeError extends InvalidValueError {
  constructor(
    path: PropertyKey[],
    expectedType: TypeDef,
    hasValue: boolean,
    value?: unknown,
  ) {
    if (hasValue) {
      super(path, typeMapString(expectedType), getTypeName(value))
    } else {
      super(path, typeMapString(expectedType))
    }
  }
}

export function union<Types extends TypeDef[]>(
  ...args: Types
): {
  readonly [key in keyof Types]: Types[key]
} & { readonly [UNION]: true } {
  return Object.assign(
    [...args] as {
      readonly [key in keyof Types]: Types[key]
    },
    { [UNION]: true } as const,
  )
}

export function intersection<Types extends TypeDef[]>(
  ...args: Types
): {
  readonly [key in keyof Types]: Types[key]
} & { readonly [UNION]: true } {
  return Object.assign(
    [...args] as {
      readonly [key in keyof Types]: Types[key]
    },
    { [UNION]: true } as const,
  )
}

export type ErrorCtors = {
  InvalidValueError: new (
    path: PropertyKey[],
    expectedValue: string,
    value?: string,
  ) => Error
  InvalidTypeError: new (
    path: PropertyKey[],
    expectedType: TypeDef,
    hasValue: boolean,
    value: unknown,
  ) => Error
}

export function assertType<Type extends TypeDef>(
  o: unknown,
  type: Type,
  ErrorCtors?: Partial<ErrorCtors>,
): asserts o is ResolvedType<Type>
export function assertType<Type extends TypeDef>(
  o: unknown,
  type: Type,
  {
    InvalidValueError: InvalidValueErrorCtor = InvalidValueError,
    InvalidTypeError: InvalidTypeErrorCtor = InvalidTypeError,
  }: Partial<ErrorCtors> = {},
  path: PropertyKey[] = [],
): asserts o is ResolvedType<Type> {
  const ErrorCtors = {
    InvalidValueError: InvalidValueErrorCtor,
    InvalidTypeError: InvalidTypeErrorCtor,
  }
  if (typeof type === 'function') {
    if (type(o, ErrorCtors, path) === false) {
      throw new InvalidTypeErrorCtor(path, type, true, o)
    }
    return
  }
  if (isValidType(type)) {
    if ((typeGuards[type] as (typeof typeGuards)[TypeName])(o)) return
    throw new InvalidTypeErrorCtor(path, type, true, o)
  }
  if (isArray(type)) {
    if (UNION in type && type[UNION] === true) {
      if (!type.some(subType => isType(o, subType)))
        throw new InvalidTypeError(path, type, true, o)
    } else if (INTERSECTION in type && type[INTERSECTION] === true) {
      if (!type.every(subType => isType(o, subType)))
        throw new InvalidTypeError(path, type, true, o)
    } else {
      const [nestedType] = type
      type.forEach((value, i) =>
        assertType.call<
          null,
          [
            o: unknown,
            type: TypeDef,
            ErrorCtors?: Partial<ErrorCtors>,
            path?: PropertyKey[],
          ],
          void
        >(null, value, nestedType, ErrorCtors, [...path, i]),
      )
    }
  } else if (typeof type === 'object' && type != null) {
    const props = [
      ...Object.getOwnPropertySymbols(type),
      ...Object.getOwnPropertyNames(type),
    ] as const
    if ((typeof o !== 'object' && typeof o !== 'function') || o == null) {
      throw new InvalidTypeError(path, type, true, o)
    }
    props.forEach(key => {
      if (key in o) {
        assertType.call<
          null,
          [
            o: unknown,
            type: TypeDef,
            ErrorCtor?: Partial<ErrorCtors>,
            path?: PropertyKey[],
          ],
          void
        >(null, o[key as keyof typeof o], type[key], ErrorCtors, [...path, key])
      } else {
        throw new InvalidTypeError([...path, key], type[key], false)
      }
    })
  } else if (typeof type === 'symbol') {
    if (o !== type) {
      throw new InvalidTypeError(path, type, true, o)
    }
  } else {
    throw new Error(`Unknown type configuration: ${String(type)}`)
  }
}

export function isType<Type extends TypeDef>(
  o: unknown,
  type: Type,
): o is ResolvedType<Type>
export function isType<Type extends TypeDef>(
  this: unknown,
  o: unknown,
  type: Type,
  path: PropertyKey[] = [],
): o is ResolvedType<Type> {
  if (typeof type === 'function') {
    try {
      return type(o, { InvalidValueError, InvalidTypeError }, path) !== false
    } catch (err) {
      if (
        typeof err === 'object' &&
        (err instanceof InvalidValueError || err instanceof InvalidTypeError)
      ) {
        return false
      }
      throw err
    }
  }
  if (isValidType(type)) {
    return (typeGuards[type] as (typeof typeGuards)[TypeName])(o)
  }
  if (isArray(type)) {
    if (UNION in type && type[UNION] === true) {
      return type.some(subType =>
        isType.call<
          unknown,
          [o: unknown, type: TypeDef, path?: PropertyKey[]],
          void
        >(this, o, subType, path),
      )
    } else if (INTERSECTION in type && type[INTERSECTION] === true) {
      return type.every(subType =>
        isType.call<
          unknown,
          [o: unknown, type: TypeDef, path?: PropertyKey[]],
          void
        >(this, o, subType, path),
      )
    } else {
      const [nestedType] = type
      return type.every((value, i) =>
        isType.call<
          unknown,
          [o: unknown, type: TypeDef, path?: PropertyKey[]],
          void
        >(this, value, nestedType, [...path, i]),
      )
    }
  } else if (type && typeof type === 'object') {
    const props = [
      ...Object.getOwnPropertySymbols(type),
      ...Object.getOwnPropertyNames(type),
    ] as const
    return props.every(key => {
      if (
        (typeof o === 'object' || typeof o === 'function') &&
        o != null &&
        key in o
      ) {
        return isType.call<
          unknown,
          [o: unknown, type: TypeDef, path?: PropertyKey[]],
          void
        >(this, o[key as keyof typeof o], type[key], [...path, key])
      }
      return false
    })
  } else if (typeof type === 'symbol') {
    return o === type
  }
  return false
}
