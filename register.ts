
declare global {
    const override: (_target: any, _propertyKey: string, _descriptor?: PropertyDescriptor) => void;

    interface Window {
        override: (_target: any, _propertyKey: string, _descriptor?: PropertyDescriptor) => void;
    }

    namespace NodeJS {
        interface Global {
            override: (_target: any, _propertyKey: string, _descriptor?: PropertyDescriptor) => void;
        }
    }
}

export const ctx = typeof window !== 'undefined' ?
    window : global;

export function override(_target: any, _propertyKey: string, _descriptor?: PropertyDescriptor) {
    // noop
}

ctx.override = override;
