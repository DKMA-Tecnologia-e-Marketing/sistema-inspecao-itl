export const serialize = (data: unknown) => JSON.stringify(data);
export const deserialize = <T>(data: string): T => JSON.parse(data) as T;

export default {
  serialize,
  deserialize,
};

