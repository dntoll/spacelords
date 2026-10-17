import { describe, expect, it } from 'vitest';
import { HealthController } from '../../src/server/controllers/HealthController.js';
import { HealthModel } from '../../src/server/models/HealthModel.js';

describe('serverstatus', () => {
  it('returns a serializable health response without HTTP dependencies', () => {
    const controller = new HealthController(new HealthModel());

    expect(controller.getStatus()).toEqual({ status: 'ok' });
  });

  it('does not let callers corrupt later health responses', () => {
    const controller = new HealthController(new HealthModel());

    expect(() =>
      Object.assign(controller.getStatus(), { status: 'broken' }),
    ).toThrow(TypeError);
    expect(controller.getStatus()).toEqual({ status: 'ok' });
  });
});
