/**
 * ID utilities
 */

export interface IdGenerator {
  readonly newId: () => string;
}

const newId = (): string => {
  return globalThis.crypto.randomUUID();
};

const ids: IdGenerator = { newId };

export default ids;
