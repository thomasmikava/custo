export function intersectWith<T extends any>(
	this: Set<T>,
	set2: Set<T>
) {
	for (const x of this) {
		if (!set2.has(x)) this.delete(x);
	}
	return this;
}

export function unionWith<T extends any>(
	this: Set<T>,
	set2: Iterable<T>
) {
	for (const x of set2) {
		this.add(x);
	}
	return this;
}

export function subtractSet<T extends any>(
	this: Set<T>,
	set2: Iterable<T>
) {
	for (const x of set2) {
		this.delete(x);
	}
	return this;
}
