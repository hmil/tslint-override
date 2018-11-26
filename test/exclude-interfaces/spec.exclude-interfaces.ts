interface TestInterface1 {
    func1();
}

class ImplClass1 implements TestInterface1 {
    func1() {
    }
}

interface TestInterface2 {
    func1();
    func2();
    func3();
}

abstract class AbstractClass2 implements TestInterface2 {
    /**
     * @override
     */
    func1() {
    }
    func2() {
    }

    abstract func3();
}

class ImplClass2 extends AbstractClass2 {
    /**
     * @override
     */
    func3() {
    }
}