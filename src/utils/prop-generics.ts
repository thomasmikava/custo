import { CustoComponent } from "../classes/components";
import { CustoText, CustoTextProps } from "../classes/texts";
import { CustoHook } from "../classes/hook";
import { CustoData } from "../classes/data";

export type RichText = string | number | JSX.Element;

type Hey<T, Args extends readonly any[]> = T | CustoHook<(...args: Args) => T>;

export type GeneralCustoHTMLElement<
	ExtraProps extends Record<any, any> = {}
> = Hey<
	CustoComponent<React.HTMLProps<any> & ExtraProps>,
	[React.HTMLProps<any> & ExtraProps]
>;

export type GeneralCustoText<
	Props extends CustoTextProps = CustoTextProps
> = Hey<CustoText<Props>, [Props]>;

export type GeneralCustoComp<T extends Record<any, any>, Ref = unknown> = Hey<
	CustoComponent<T, Ref>,
	[T]
>;

export type GeneralCustData<Data, HiddenArgs extends readonly any[] = []> =
	| CustoData<Data, HiddenArgs>
	| CustoHook<(...args: HiddenArgs) => Data>;

export type GeneralCustoHook<Fn extends (...args: any[]) => any> = CustoHook<
	Fn
>;
