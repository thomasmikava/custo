const Which: BMapConstructor = WeakMap as any;

export class MultiDimentionalWeakMap<Length extends number> {
	private weakMap = new Which<any, any>();
	constructor(private readonly length: Length) {
		this.weakMap = new Which();
	}

	get(keys: Record<any, any>[]) {
		if (keys.length !== this.length) {
			throw new Error("incorrect number of keys passed");
		}
		let last: any = this.weakMap;
		for (const key of keys) {
			last = last.get(key);
			if (!last || !(last instanceof Which)) break;
		}
		return last;
	}

	set(keys: Record<any, any>[], value: any) {
		if (keys.length !== this.length) {
			throw new Error("incorrect number of keys passed");
		}
		let last = this.weakMap;
		for (let i = 0; i < keys.length - 1; i++) {
			const key = keys[i];
			let val = last.get(key);
			if (!val) {
				val = new Which();
				last.set(key, val);
			}
			last = val;
		}
		const lastKey = keys[keys.length - 1];
		last.set(lastKey, value);
	}
}

interface BMap<K, V> {
	get(key: K): V | undefined;
	set(key: K, valye: V);
}

interface BMapConstructor {
	new <K, V>(): BMap<K, V>;
}
