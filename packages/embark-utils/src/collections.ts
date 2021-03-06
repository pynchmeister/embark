const merge = require("merge");

export function last(array: any) {
  return array[array.length - 1];
}

export function recursiveMerge(target: any, source: any) {
  return merge.recursive(target, source);
}

export function compact(array: any) {
  return array.filter((n: any) => n);
}
