import { CustoComponent } from "../classes/components";
import { CustoText, CustoTextProps } from "../classes/texts";
import { CustoHook } from "../classes/hook";
import { CustoData } from "../classes/data";
import { CustoClass } from "../interfaces";

export type RichText = string | number | JSX.Element;

export type ValueOrHook<T, Args extends readonly any[]> =
	| T
	| CustoHook<(...args: Args) => T>;

export type GeneralCustoHTMLElement<
	ExtraProps extends Record<any, any> = {}
> = ValueOrHook<
	CustoComponent<React.HTMLProps<any> & ExtraProps>,
	[React.HTMLProps<any> & ExtraProps]
>;

export type GeneralCustoText<
	Props extends CustoTextProps = CustoTextProps
> = ValueOrHook<CustoText<Props>, [Props]>;

export type GeneralCustoComp<
	T extends Record<any, any>,
	Ref = unknown
> = ValueOrHook<CustoComponent<T, Ref>, [T]>;

export type GeneralCustData<Data, HiddenArgs extends readonly any[] = []> =
	| CustoData<Data, HiddenArgs>
	| CustoHook<(...args: HiddenArgs) => Data>;

export type GeneralCustoHook<Fn extends (...args: any[]) => any> = CustoHook<
	Fn
>;

//

export type VeryGeneralCustoText<
	Props extends CustoTextProps = CustoTextProps
> = ValueOrHook<CustoText<Props>, [Props]> | RichText;

export type VeryGeneralCustoComp<
	T extends Record<any, any>,
	Ref = unknown
> = ValueOrHook<CustoComponent<T, Ref>, [T]> | React.ComponentType<T>;

export type VeryGeneralCustData<Data, HiddenArgs extends readonly any[] = []> =
	| CustoData<Data, HiddenArgs>
	| CustoHook<(...args: HiddenArgs) => Data> | Data;

export type VeryGeneralCustoHook<Fn extends (...args: any[]) => any> = CustoHook<
	Fn
> | Fn;

//

export type NeverOrCustoClass<T> = T extends CustoClass ? T : never;
export type NeverOrCustoClassReverse<T> = T extends CustoClass ? never : T;

export type CustoClassToGeneral<
	T extends CustoClass
> = T extends CustoComponent<infer P, infer R>
	? GeneralCustoComp<P, R>
	: T extends CustoText<infer Props>
	? GeneralCustoText<Props>
	: T extends CustoData<infer Data, infer HiidenArgs>
	? GeneralCustData<Data, HiidenArgs>
	: T extends CustoHook<infer Fn>
	? T | NeverOrCustoClass<ReturnType<Fn>>
	: T;

export type CustoClassToVeryGeneral<
	T extends CustoClass
> = T extends CustoComponent<infer P, infer R>
	? VeryGeneralCustoComp<P, R>
	: T extends CustoText<infer Props>
	? VeryGeneralCustoText<Props>
	: T extends CustoData<infer Data, infer HiidenArgs>
	? VeryGeneralCustData<Data, HiidenArgs>
	: T extends CustoHook<infer Fn>
	? T | ReturnType<Fn>
: T;

export type ToGeneralCusto<T> = T extends CustoClass
	? CustoClassToGeneral<T>
	: T extends Record<any, any>
	? {
			[key in keyof T]: ToGeneralCusto<T[key]>;
	  }
	: T;
	
export type ToVeryGeneralCusto<T> = T extends CustoClass
	? CustoClassToVeryGeneral<T>
	: T extends Record<any, any>
	? {
			[key in keyof T]: ToVeryGeneralCusto<T[key]>;
	}
	: T;

export const toGeneralCusto = <T extends any>(val: T): ToGeneralCusto<T> =>
	val as any;
