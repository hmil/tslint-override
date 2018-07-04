abstract class First {

}

class Foo extends First {
    /* non doc comment */
    /** doc comment **/
    public bar(): void { }

    public notToOverride(): void { } 
}

export class Baz extends Foo{
    /**
     * Multiline doc comment
     @Override
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

    public notToOverride(): void { }
}
