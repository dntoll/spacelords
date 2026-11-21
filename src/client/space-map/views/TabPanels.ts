import { element } from '../../common/dom.js';

export interface TabPanel {
  readonly name: string;
  readonly label: string;
  readonly panel: HTMLElement;
}

/**
 * forskningsflikar / produktionsflikar: panels sharing one area, one shown at
 * a time. `onChange` lets the view remember the choice across re-renders.
 */
export function tabPanels(
  tabs: readonly TabPanel[],
  active: string,
  onChange: (name: string) => void = () => {},
): HTMLElement {
  const area = element('section', 'tab-panels');
  const bar = element('div', 'tab-panels-bar');
  bar.setAttribute('role', 'tablist');
  const show = (name: string) => {
    area.dataset.tab = name;
    for (const tab of tabs) {
      tab.panel.hidden = tab.name !== name;
      bar
        .querySelector(`[data-tab="${tab.name}"]`)
        ?.setAttribute('aria-selected', String(tab.name === name));
    }
  };
  for (const tab of tabs) {
    const control = element('button', 'tab-panels-tab', tab.label);
    control.type = 'button';
    control.dataset.tab = tab.name;
    control.setAttribute('role', 'tab');
    control.addEventListener('click', () => {
      show(tab.name);
      onChange(tab.name);
    });
    bar.append(control);
  }
  area.append(bar, ...tabs.map((tab) => tab.panel));
  show(tabs.some((tab) => tab.name === active) ? active : tabs[0]!.name);
  return area;
}
