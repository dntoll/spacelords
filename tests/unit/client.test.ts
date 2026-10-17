// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppView } from '../../src/client/views/AppView.js';

describe('tom-startsida', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('renders the model through the controller in the supplied root', () => {
    const root = document.createElement('main');
    const model = new AppModel();
    const controller = new AppController(model, new AppView(root));

    controller.start();

    expect(root.querySelector('h1')?.textContent).toBe('Spacelords');
  });

  it('renders model text without interpreting HTML', () => {
    const root = document.createElement('main');
    const name = '<img src=x onerror="alert(1)">';

    new AppController(new AppModel(name), new AppView(root)).start();

    expect(root.querySelector('h1')?.textContent).toBe(name);
    expect(root.querySelector('img')).toBeNull();
  });
});

describe('mvc-arkitektur', () => {
  it('protects model state from writes through the read interface', () => {
    const model = new AppModel();

    expect(() => Object.assign(model.snapshot, { name: 'Changed' })).toThrow(
      TypeError,
    );
    expect(model.snapshot.name).toBe('Spacelords');
  });
});
