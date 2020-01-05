// tslint:disable callable-types
// tslint:disable variable-name

declare type NoopDecorator = () => (_target: any, _propertyKey: string, _descriptor?: PropertyDescriptor) => void;

declare global {
  /**
   * Indicates that this function or variable is being overridden
   * from the implemented or extended parent class.
   *
   * @see [TSLint Override](https://github.com/hmil/tslint-override)
   */
  var override: NoopDecorator;

  /**
   * Indicates that this function or variable is being overridden
   * from the implemented or extended parent class.
   *
   * @see [TSLint Override](https://github.com/hmil/tslint-override)
   */
  var Override: NoopDecorator;
}

export const ctx = this;
ctx.override = () => () => { /* noop */ };
ctx.Override = () => () => { /* noop */ };
