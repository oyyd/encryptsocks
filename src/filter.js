import { getDstStr } from './utils';

// TODO:
let defaultDenyList = [
  // /google/,
];
let denyListLength = defaultDenyList.length;

export function setDenyList(denyList) {
  defaultDenyList = denyList;
  denyListLength = denyList.length;
}

export function filter(dstInfo) {
  const dstStr = getDstStr(dstInfo);

  let i;

  for (i = 0; i < denyListLength; i += 1) {
    if (defaultDenyList[i].test(dstStr)) {
      return false;
    }
  }

  return true;
}
