import { CustoClass } from "../interfaces";
import React from "react";
import { CustoComponent } from "..";

type IsPlainObject<T> = T extends Function
	? false
	: T extends any[]
	? false
	: T extends CustoClass
	? false
	: T extends Record<any, any>
	? true
	: false;

export type DeeplyRequired<T> = T extends undefined
	? never
	: IsPlainObject<T> extends true
	? {
			[key in keyof T]-?: NonNullable<DeeplyRequired<T[key]>>;
	  }
	: T;

export type DeeplyOptional<T> = IsPlainObject<T> extends true
	? {
			[key in keyof T]?: DeeplyOptional<T[key]>;
	  }
	: T;

export type ComponentRef<C> = C extends React.Component
	? C
	: C extends new (props: any) => React.Component
	? InstanceType<C>
	: C extends React.ForwardRefExoticComponent<infer Props>
	? Props extends { ref?: React.Ref<infer R> }
		? R
		: never
	: C extends React.ForwardRefRenderFunction<infer T, any>
	? T
	: (C extends React.JSXElementConstructor<{ ref?: infer R }>
		? R
		: C extends keyof JSX.IntrinsicElements
		? JSX.IntrinsicElements[C]["ref"]
		: unknown) extends React.Ref<infer T> | string | undefined
	? T
	: unknown;

export type ComponentProps<C> = C extends React.ComponentType<infer Props>
	? Props
	: never;

export type CustoComponentProps<C> = C extends CustoComponent<infer Props, any>
	? Props
	: never;
