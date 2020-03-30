import '../../angular-register';

abstract class First {

}

class Foo extends First {
    /* non doc comment */
    /** doc comment **/
    public bar(): void { }

    public bar2(): void { }

    public overrideMe(arg0: string): number { return 0; }
    public overrideMe2(arg0: string): number { return 0; }
    public overrideMe3(arg0: string): number { return 0; }

    public notToOverride(): void { }

    public overloadedMethod(): void;
    public overloadedMethod(v: string): void;
    public overloadedMethod(v?: string): void { }
}

export class Baz extends Foo {
    /**
     * Multiline doc comment
     @override
     */
    /**
      Second multi doc comment
      @override
    **/
    public bar(): void { }

    /**
     * @override
     */
    public baz(): void { }

    /**
     * This function is already documented.
     * @param arg0 - Some unused argument
     * @return A [random number](https://xkcd.com/221/)
     *
     * @since 0.2.2
     */
    public overrideMe(arg0: string): number {
        return 1;
    }

    /**
      This function is already documented with a bad format.
      @param arg0 - Some unused argument
      @return A [random number](https://xkcd.com/221/)

      @since 0.2.2
    */
    public overrideMe2(arg0: string): number {
        return 1;
    }

    /** This function is already documented on one line */
    public overrideMe3(arg0: string): number {
        return 1;
    }

    public notToOverride(): void { }

    @override()
    @override public bar2(): void { }

    public overloadedMethod(): void;
    public overloadedMethod(v: string): void;
    public overloadedMethod(v?: string): void { }
}

export const Fiz = class extends Foo {
    public bar() { };
};
