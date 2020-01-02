define = (function () {

function parseModulePath(pathString) {
    // This used to handle backslash-escaped characters, but simpler is better.
    return pathString.split('/');
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

const dependencies = {},  // module path -> array of module paths
      initializers = {};  // module path -> function

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

const modules = {},   // module path -> object (loaded module)
      promises = {};  // module path -> Promise (loading/loaded module)

function load(moduleName, ancestors) {
    function recur(name) {
        return load(name, ancestors);
    }

    if (moduleName === undefined) {
        // load all modules and then resolve to the map of all modules
        return Promise.all(Object.keys(dependencies).map(recur))
                      .then(() => modules);
    }

    if (moduleName in promises) {
        // If the module is already being loaded, or already has been loaded,
        // then return the relevant Promise.
        return promises[moduleName];
    }

    const deps = dependencies[moduleName];
    if (deps === undefined) {
        throw Error(`Unknown module name ${JSON.stringify(moduleName)}.  ` +
                    'Here is the dependency chain: ' +
                    JSON.stringify(ancestors) +
                    '.  Here are the known module names: ' +
                    JSON.stringify(Object.keys(dependencies)));
    }

    ancestors = ancestors.concat([moduleName])

    if (ancestors.indexOf(moduleName) !== ancestors.length - 1) {
        throw Error('Dependency cycle detected.  The module ' +
                    JSON.stringify(moduleName) + ' is depended upon by one ' +
                    'of its (direct or indirect) dependencies.  Here is the ' +
                    'dependency chain: ' + JSON.stringify(ancestors));
    }

    const promise = Promise.all(deps.map(recur)).then(loadedDeps => {
        const loadedModule = initializers[moduleName](...loadedDeps);
        modules[moduleName] = loadedModule;
        return loadedModule;
    });

    promises[moduleName] = promise;
    return promise;
}

return Object.assign(defineModule, {
    load: moduleName => load(moduleName, []),
    modules,
    amd: {}  // per the spec (though we're techincally non-conforming)
});

}());
