export function autoSaveToLocalStorage<T extends object>(key: string, rootObject: T) {
  const save = () => {
    localStorage.setItem(key, JSON.stringify(rootObject));
  };

  const handler = {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'object' && value !== null) {
        // Recursively wrap nested objects
        return createProxy(value, save);
      }
      return value;
    },
    set(target, prop, value, receiver) {
      const result = Reflect.set(target, prop, value, receiver);
      save(); // Save to localStorage whenever a property is set
      return result;
    },
    deleteProperty(target, prop) {
      const result = Reflect.deleteProperty(target, prop);
      save(); // Save to localStorage on property delete
      return result;
    },
  };

  // Cache proxies to avoid infinite recursion and preserve identity
  const proxyCache = new WeakMap();

  function createProxy(obj, saveCallback) {
    if (proxyCache.has(obj)) {
      return proxyCache.get(obj);
    }
    const proxy = new Proxy(obj, handler);
    proxyCache.set(obj, proxy);
    return proxy;
  }

  return createProxy(rootObject, save);
}
