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
     @override
     */
    /**
      Second multi doc comment
      **/
    public bar(): void { }
    
    /**
     * 
     */
    public baz(): void { }

    /** @override */ public notToOverride(): void { }
}
