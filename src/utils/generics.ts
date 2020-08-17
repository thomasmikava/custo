type IsPlainObject<T> = T extends Function
	? false
	: T extends any[]
	? false
	: T extends { $$end$$: true }
	? false
	: T extends Record<any, any>
	? true
	: false;

export type DeeplyRequired<T> = IsPlainObject<T> extends true
	? {
			[key in keyof T]-?: DeeplyRequired<T[key]>;
	  }
	: T;

export type DeeplyOptional<T> = IsPlainObject<T> extends true
	? {
			[key in keyof T]?: DeeplyOptional<T[key]>;
	  }
	: T;
