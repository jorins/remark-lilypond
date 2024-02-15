const NamedError: ErrorConstructor = Object.setPrototypeOf(function NamedError(
  this: unknown,
  ...args:
    | ConstructorParameters<ErrorConstructor>
    | Parameters<ErrorConstructor>
) {
  let instance: Error
  if (new.target) {
    instance = Reflect.construct(
      Error,
      args as ConstructorParameters<ErrorConstructor>,
      new.target,
    )
  } else {
    instance = Reflect.apply(Error, this, args as Parameters<ErrorConstructor>)
  }
  const { constructor } = this as { constructor: unknown }
  if (
    constructor != null &&
    (typeof constructor == 'object' || typeof constructor === 'function') &&
    'name' in constructor &&
    constructor.name &&
    typeof constructor.name == 'string'
  ) {
    instance.name = constructor.name
  }
  return instance
}, Error);
(NamedError as { prototype: Error }).prototype = Error.prototype;

export default NamedError
