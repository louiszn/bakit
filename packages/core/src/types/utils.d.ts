export type EnumValue<T extends number> = `${T}` extends `${infer N extends number}` ? N : never;
