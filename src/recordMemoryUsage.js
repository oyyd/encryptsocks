// NOTE: do not use this in production
import { writeFileSync } from 'fs';
import { join } from 'path';

export const INTERVAL_TIME = 1000;

let data = null;

export function record(frame) {
  data = data || [];

  data.push(frame);
}

export function stopRecord() {
  if (data) {
    writeFileSync(join(__dirname, '../logs/memory.json'), JSON.stringify(data));
  }
}
