class MyPromise {
  static PENDING = 'pending';
  static FULFILLED = 'fulfilled';
  static REJECTED = 'rejected';

  constructor(executor) {
    this.state = MyPromise.PENDING;
    this.result = null;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      if (value instanceof MyPromise) {
        return value.then(resolve, reject);
      }

      if (this.state !== MyPromise.PENDING) return;

      this.state = MyPromise.FULFILLED;
      this.result = value;
      this.onFulfilledCallbacks.forEach((callback) => {
        callback();
      });
    };

    const reject = (reason) => {
      if (this.state !== MyPromise.PENDING) return;

      this.state = MyPromise.REJECTED;
      this.result = reason;
      this.onRejectedCallbacks.forEach((callback) => {
        callback();
      });
    };

    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  then(onFulfilled, onRejected) {
    onFulfilled =
      typeof onFulfilled === 'function' ? onFulfilled : (value) => value;
    onRejected =
      typeof onRejected === 'function'
        ? onRejected
        : (reason) => {
            throw reason;
          };

    const promise2 = new MyPromise((resolve, reject) => {
      if (this.state === MyPromise.FULFILLED) {
        setTimeout(() => {
          try {
            const x = onFulfilled(this.result);
            _resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      } else if (this.state === MyPromise.REJECTED) {
        setTimeout(() => {
          try {
            const x = onRejected(this.result);
            _resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      } else if (this.state === MyPromise.PENDING) {
        this.onFulfilledCallbacks.push(() => {
          setTimeout(() => {
            try {
              const x = onFulfilled(this.result);
              _resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          });
        });
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              const x = onRejected(this.result);
              _resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          });
        });
      }
    });

    return promise2;
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  finally(callback) {
    callback = typeof callback === 'function' ? callback : () => {};

    return this.then(
      (value) => {
        return MyPromise.resolve(callback()).then(() => value);
      },
      (reason) => {
        return MyPromise.resolve(callback()).then(() => {
          throw reason;
        });
      },
    );
  }

  static resolve(value) {
    return new MyPromise((resolve, reject) => {
      resolve(value);
    });
  }

  static reject(reason) {
    return new MyPromise((resolve, reject) => {
      reject(reason);
    });
  }

  static all(promises) {
    return new MyPromise((resolve, reject) => {
      const n = promises.length;
      const result = new Array(n);
      let count = 0;
      const processResultByKey = (value, index) => {
        result[index] = value;
        if (++count === n) {
          resolve(result);
        }
      };
      for (let i = 0; i < n; i++) {
        const promise = promises[i];
        if (promise && typeof promise.then === 'function') {
          promise.then((value) => {
            processResultByKey(value, i);
          }, reject);
        } else {
          processResultByKey(promise, i);
        }
      }
    });
  }

  static race(promises) {
    return new MyPromise((resolve, reject) => {
      const n = promises.length;
      for (let i = 0; i < n; i++) {
        const promise = promises[i];
        if (promise && typeof promise.then === 'function') {
          promise.then(resolve, reject);
        } else {
          reject(promise);
        }
      }
    });
  }

  // 要使用 promises-aplus-tests 这个工具测试，必须实现一个静态方法deferred()
  static deferred() {
    const deferred = {};
    deferred.promise = new MyPromise((resolve, reject) => {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
    return deferred;
  }
}

function _resolvePromise(promise2, x, resolve, reject) {
  if (promise2 === x) {
    return reject(new TypeError('Chaining cycle detected for promise'));
  }

  if (x != null && (typeof x === 'object' || typeof x === 'function')) {
    let then;
    try {
      then = x.then;
    } catch (e) {
      reject(e);
    }

    if (typeof then === 'function') {
      let called = false;
      try {
        then.call(
          x,
          (y) => {
            if (called) return;
            called = true;
            _resolvePromise(promise2, y, resolve, reject);
          },
          (r) => {
            if (called) return;
            called = true;
            reject(r);
          },
        );
      } catch (e) {
        if (called) return;
        called = true;
        reject(e);
      }
    } else {
      resolve(x);
    }
  } else {
    resolve(x);
  }
}

module.exports = MyPromise;
