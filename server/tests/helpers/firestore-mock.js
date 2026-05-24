function deepClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createFirestoreMock(seed = {}) {
  const store = new Map();
  let autoId = 0;
  const calls = {
    collectionGet: 0,
    docGet: 0,
    docSet: 0,
    docUpdate: 0,
    docDelete: 0,
    add: 0,
  };

  for (const [key, value] of Object.entries(seed)) {
    store.set(key, deepClone(value));
  }

  function getPath(collectionName, docId) {
    return `${collectionName}/${docId}`;
  }

  function makeDocSnapshot(path) {
    const exists = store.has(path);
    const value = store.get(path);
    return {
      exists,
      id: path.split("/")[1],
      data: () => deepClone(value),
    };
  }

  function mergeObjects(target, patch) {
    const base = target && typeof target === "object" ? target : {};
    const next = patch && typeof patch === "object" ? patch : {};
    return {
      ...base,
      ...next,
    };
  }

  function makeCollectionSnapshot(collectionName) {
    const prefix = `${collectionName}/`;
    const docs = [];
    for (const [path, value] of store.entries()) {
      if (!path.startsWith(prefix)) continue;
      docs.push({
        id: path.slice(prefix.length),
        data: () => deepClone(value),
      });
    }

    return {
      empty: docs.length === 0,
      docs,
      forEach(callback) {
        for (const doc of docs) {
          callback(doc);
        }
      },
    };
  }

  const db = {
    collection(collectionName) {
      return {
        async get() {
          calls.collectionGet += 1;
          return makeCollectionSnapshot(collectionName);
        },
        async add(data) {
          calls.add += 1;
          autoId += 1;
          const id = `auto-${autoId}`;
          store.set(getPath(collectionName, id), deepClone(data));
          return { id };
        },
        doc(docId) {
          const path = getPath(collectionName, docId);
          return {
            async get() {
              calls.docGet += 1;
              return makeDocSnapshot(path);
            },
            async set(data, options = {}) {
              calls.docSet += 1;
              if (options.merge) {
                const current = store.get(path);
                store.set(path, mergeObjects(current, data));
                return;
              }
              store.set(path, deepClone(data));
            },
            async update(patch) {
              calls.docUpdate += 1;
              const current = store.get(path) || {};
              store.set(path, mergeObjects(current, patch));
            },
            async delete() {
              calls.docDelete += 1;
              store.delete(path);
            },
          };
        },
      };
    },
  };

  return {
    db,
    store,
    calls,
    getDoc(collectionName, docId) {
      return deepClone(store.get(getPath(collectionName, docId)));
    },
  };
}

module.exports = {
  createFirestoreMock,
};
