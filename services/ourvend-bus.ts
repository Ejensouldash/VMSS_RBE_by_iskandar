import { EventEmitter } from 'events';

const bus = new EventEmitter();
bus.setMaxListeners(100);

export { bus };

export function emitRecord(rec: any) {
  try {
    bus.emit('record', rec);
  } catch (e) {
    console.error('emitRecord failed', e);
  }
}
