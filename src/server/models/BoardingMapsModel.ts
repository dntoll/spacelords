import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  BOARDING_MAP_FILES,
  formatBoardingMap,
  parseBoardingMapText,
  type BoardingMapId,
} from '../../shared/boarding-map-format.js';

export interface BoardingMapListItem {
  readonly id: BoardingMapId;
  readonly name: string;
}

function isMapId(value: string): value is BoardingMapId {
  return Object.hasOwn(BOARDING_MAP_FILES, value);
}

export class BoardingMapsModel {
  readonly #directory: string;

  constructor(directory: string) {
    this.#directory = directory;
  }

  get available(): boolean {
    return existsSync(this.#directory);
  }

  list(): readonly BoardingMapListItem[] {
    const maps: BoardingMapListItem[] = [];
    for (const id of Object.keys(BOARDING_MAP_FILES) as BoardingMapId[]) {
      const file = this.#file(id);
      if (!existsSync(file)) continue;
      const text = parseBoardingMapText(readFileSync(file, 'utf8'));
      maps.push(Object.freeze({ id, name: text.name }));
    }
    return Object.freeze(maps);
  }

  read(id: string): string {
    return readFileSync(this.#file(this.#id(id)), 'utf8');
  }

  write(id: string, source: string): string {
    const mapId = this.#id(id);
    const formatted = formatBoardingMap(parseBoardingMapText(source));
    const target = this.#file(mapId);
    const temporary = path.join(
      this.#directory,
      `.${mapId}.${randomBytes(8).toString('hex')}.tmp`,
    );
    writeFileSync(temporary, formatted, 'utf8');
    renameSync(temporary, target);
    return formatted;
  }

  #id(id: string): BoardingMapId {
    if (!isMapId(id)) throw new Error('Unknown boarding map.');
    return id;
  }

  #file(id: BoardingMapId): string {
    return path.join(this.#directory, BOARDING_MAP_FILES[id]);
  }
}
