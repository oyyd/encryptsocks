import { unlinkSync, writeFileSync, accessSync, readFileSync } from 'fs';
import { join } from 'path';
import { mkdirIfNotExistSync } from './utils';

export const TMP_PATH = join(__dirname, '../tmp');

export function getFileName(type) {
  switch (type) {
    case 'local':
      return join(TMP_PATH, 'local.pid');
    case 'server':
      return join(TMP_PATH, 'server.pid');
    default:
      throw new Error(`invalid 'type' of filename ${type}`);
  }
}

export function getPid(type) {
  const fileName = getFileName(type);

  mkdirIfNotExistSync(TMP_PATH);

  try {
    accessSync(fileName);
  } catch (e) {
    return null;
  }

  return readFileSync(fileName).toString('utf8');
}

export function writePidFile(type, pid) {
  mkdirIfNotExistSync(TMP_PATH);

  writeFileSync(getFileName(type), pid);
}

export function deletePidFile(type) {
  mkdirIfNotExistSync(TMP_PATH);

  try {
    unlinkSync(getFileName(type));
  } catch (err) {
    // alreay unlinked
  }
}
