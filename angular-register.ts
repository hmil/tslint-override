// tslint:disable callable-types
// tslint:disable variable-name

declare type NoopDecorator = () => (_target: any, _propertyKey: string, _descriptor?: PropertyDescriptor) => void;

declare var global: NodeJS.Global;
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

  interface Window {
    override: NoopDecorator;
    Override: NoopDecorator;
  }

  namespace NodeJS {
    interface Global {
      override: NoopDecorator;
      Override: NoopDecorator;
    }
  }
}

export const ctx =
  typeof global === 'undefined' ? (typeof window === 'undefined' ? undefined : window) : global;
export const override: NoopDecorator = () => () => { /* noop */ };
export const Override: NoopDecorator = () => () => { /* noop */ };

if (ctx) {
  ctx.override = override;
  ctx.Override = Override;
}
