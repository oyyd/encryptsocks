import { unlinkSync, mkdirSync, writeFileSync, accessSync, readFileSync } from 'fs';
import { join } from 'path';

const TMP_PATH = join(__dirname, '../tmp');

function getFileName(type) {
  switch (type) {
    case 'local':
      return join(TMP_PATH, 'local.pid');
    case 'server':
      return join(TMP_PATH, 'server.pid');
    default:
      throw new Error('invalid `type` of filename');
  }
}

function checkDir() {
  try {
    accessSync(TMP_PATH);
  } catch (e) {
    mkdirSync(TMP_PATH);
  }
}

export function getPid(type) {
  const fileName = getFileName(type);

  checkDir();

  try {
    accessSync(fileName);
  } catch (e) {
    return null;
  }

  return readFileSync(fileName).toString('utf8');
}

export function writePidFile(type, pid) {
  checkDir();

  writeFileSync(getFileName(type), pid);
}

export function deletePidFile(type) {
  checkDir();

  unlinkSync(getFileName(type));
}
