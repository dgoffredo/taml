define = (function () {

function parseModulePath(pathString) {
    // Path "parts" are separated by forward slashes, but backslash-escaped
    // forward slashes are also supported, hence the negated lookbehind regex.
    // Empty "parts" are then removed -- they correspond to repeated forward
    // slashes.
    return pathString.split(/(?<!\\)\//).filter(part => part !== '');
}

function isRelativePart(pathPart) {
    return pathPart == '.' || pathPart === '..';
}

function join(path) {
    return path.join('/');
}

function resolve(relativeTo, path) {
    // leetcode #71 :P
    // `path` is an array of path parts describing a module.  `relativeTo` is
    // an array of path parts describing the "current directory," i.e. the
    // "directory" of the module ID that is listing `path` as a dependency.
    
    if (path.length < 1) {
        throw Error('An empty module path cannot be resolved.');
    }

    let stack;  // the "current directory" as we simplify `path`

    if (isRelativePart(path[0])) {
        stack = Array.from(relativeTo);
    }
    else {
        stack = [];
    }

    path.forEach(part => {
        if (part == '.') {
            // nothing to do.  Carry on.
        }
        else if (part == '..') {
            if (stack.length === 0) {
                throw Error('Invalid module path.  The path ' +
                            JSON.stringify(join(path)) +
                            ' passes through the root when resolved ' +
                            'relative to ' +
                            JSON.stringify(join(relativeTo)));
            }
            stack.pop();
        }
        else {
            stack.push(part)
        }
    });

    return stack;
}

const dependencies = {},
      initializers = {},
      modules = {};

// defineModule(name?: String, dependencies?: Array, init: function)
function defineModule(...args) {
    let name = Symbol('anonymous module'),
        deps = [],
        init;

    // The handling of the arguments is permissive, but it's simpler this way.
    args.forEach(arg => {
        if (typeof arg === 'string') {
            name = arg;
        }
        else if (Array.isArray(arg)) {
            deps = arg;
        }
        else if (typeof arg === 'function') {
            init = arg;
        }
        else {
            throw Error(`define() called with argument of type ${typeof arg}`);
        }
    });

    if (init === undefined) {
        throw Error('Arguments to define() must include an initializer ' +
                    'function');
    }

    const path = parseModulePath(name);
    if (path.some(isRelativePart)) {
        throw Error('Module IDs cannot contain relative elements, e.g. "." ' +
                    'or "..".  Error occurred for module ' +
                    JSON.stringify(name));
    }

    // Now that we've parsed the `name` into `path`, rewrite `name` using
    // `path`.  This normalizes the format of module names (e.g. no duplicate
    // forward slashes).
    name = join(path);

    if (name in dependencies) {
        throw Error('Duplicated module definition with ID ' +
                    JSON.stringify(name));
    }

    // Resolve the dependencies relative to the module path (its "directory").
    deps = deps.map(parseModulePath)                             // parse
               .map(resolve.bind(undefined, path.slice(0, -1)))  // resolve
               .map(join);                                       // stringify

    dependencies[name] = deps;
    initializers[name] = init;
}

function load(moduleName) {
    if (moduleName === undefined) {
        // load all modules and then resolve to the map of all modules
        return Promise.all(Object.keys(dependencies).map(load))
                      .then(() => modules);
    }

    if (moduleName in modules) {
        // if the module has already been loaded, return an immediate promise
        return Promise.resolve(modules[moduleName]);
    }

    const deps = dependencies[moduleName];
    if (deps === undefined) {
        throw Error(`Unknown module name ${JSON.stringify(moduleName)}.  ` +
                    'Here are the known module names: ' +
                    JSON.stringify(Object.keys(dependencies)));
    }

    // Load all of the dependencies, run the initializer for the module using
    // the loaded dependencies, store the resulting loaded module into
    // `modules`, and return the loaded module.
    return Promise.all(deps.map(load))
                  .then(loadedDeps => {
        const loadedModule = initializers[moduleName](...loadedDeps);
        modules[moduleName] = loadedModule;
        return loadedModule;
    });
}

return Object.assign(defineModule, {
    load,
    modules,
    amd: {}  // per the spec
});

}());
