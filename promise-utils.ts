// Returns a promise that is resolved by a node-style callback function
export function fromCallback<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  f: (cb: (err: any, result?: T) => void) => void
): Promise<T> {
  return new Promise<T>((resolve, reject) => f((err, result) => (err ? reject(err) : resolve(result))))
}
