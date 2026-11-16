import type { HTMLProps } from "react";
import { setOwnProperty } from "./prop";

export const deepMergeHTMLProps = (
  mainProps: HTMLProps<any>,
  secondaryProps: HTMLProps<any>
): HTMLProps<any> => {
  const newProps = { ...mainProps };
  for (const key of Object.keys(secondaryProps)) {
    const mainVal = Object.getOwnPropertyDescriptor(newProps, key)?.value;
    const secondaryVal = secondaryProps[key];
    if (mainVal === undefined) {
      setOwnProperty(newProps, key, secondaryVal);
      continue;
    }
    if (key === "className" && mainVal && secondaryVal) {
      newProps[key] = `${mainVal} ${secondaryVal}`;
      continue;
    }
    if (key === "style" && mainVal != null && secondaryVal != null) {
      newProps[key] = {
        ...secondaryVal,
        ...mainVal,
      };
    }
    if (typeof mainVal === "function" && typeof secondaryVal === "function") {
      newProps[key] = (...args: any) => {
        mainVal(...args);
        secondaryVal(...args);
      };
    }
  }
  return newProps;
};
