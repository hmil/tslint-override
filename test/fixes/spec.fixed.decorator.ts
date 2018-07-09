abstract class First {

}

class Foo extends First {
    /* non doc comment */
    /** doc comment **/
    public bar(): void { }

    public notToOverride(): void { } 
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
    @override public bar(): void { }

    /**
     * @override
     */
    public baz(): void { }

    @override public notToOverride(): void { }

    @override public bar(): void { }
}
