/**
 * WXT 全局类型声明
 */

declare function defineContentScript(config: {
  matches: string[];
  main: () => void;
}): any;

declare function defineBackground(fn: () => void): any;

