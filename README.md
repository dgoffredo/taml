<img src="garrulax-cachinnans.svg" width="300"/>

Taml
====
**T**iny **A**synchronous **M**odule **L**oader

Why
---
I like the system described in the [Asynchronous Module Definition (AMD)][1]
API specification, but instead of having a "for browser" version that
fetches scripts separately, I wanted to just `cat` the scripts together and
have everything loaded at once at runtime.

Yes, I've reinvented the wheel.  But [look][2], it's less than 200 lines.

What
----
[taml.js](taml.js) is a Javascript script that defines a global function,
`define`, that can be used to define modules according to the [AMD][1]
specification.  `define` additionally exposes two properties:

- `define.load(moduleName?)` returns a [Promise][3] that loads the optionally
  specified module and its dependencies and then returns the loaded module
  object.  If no module name is specified, then the [Promise][3] loads all
  modules and returns an object mapping fully qualified module names to
  modules.
- `define.modules` is an object of all loaded modules, keyed by fully qualified
  name.

How
---
Execute the contents of [taml.js][2] in your Javascript environment.  Then
modules can be defined using `define`, one invocation per module.  For example:
```html
<script src="taml.js"></script>

<script>
define('foo', ['util/bar', 'util/stuff'], function (Bar, Stuff) {
    const moduleObject = {
        doSomethingAmazing: () => console.log('hello, world!')
    };
    // ...initialization code...
    // ...
    return moduleObject; 
});

define('util/stuff', ['./bar'], function (Bar) {
    // ... etc...
});

define('util/bar', function () {
    // ... etc...
});

define('util/odd', ['../foo'], function (Foo) {
    // ... etc...
});

define.load().then(modules => {
    // "main" function goes here...
    // e.g.
    modules.foo.doSomethingAmazing();
});

</script>
```

[1]: https://github.com/amdjs/amdjs-api/blob/master/AMD.md
[2]: taml.js
[3]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise