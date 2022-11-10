import L from 'leaflet';

interface ButtonConfig {
  id: string;
  icon: string;
  onClickFn?: (event: MouseEvent) => void;
  altText: string;
}

interface ButtonUpdateConfig
  extends Partial<Omit<ButtonConfig, 'id'>>,
    Pick<ButtonConfig, 'id'> {
  state: 'active' | 'disabled' | 'normal';
}

function createIcon(iconClass: string) {
  const icon = L.DomUtil.create('span');
  icon.classList.add('fa', iconClass);
  return icon;
}

function createButton(config: ButtonConfig) {
  const button = L.DomUtil.create('a');
  button.classList.add('marker-control-button');
  button.setAttribute('title', config.altText);
  button.setAttribute('role', 'button');
  button.setAttribute('aria-label', config.altText);

  if (config.onClickFn) {
    button.addEventListener('click', config.onClickFn);
  }

  button.appendChild(createIcon(config.icon));
  return button;
}

export function createButtonGroup(map: L.Map, buttonConfigs: ButtonConfig[]) {
  const buttonMap = new Map<
    string,
    {
      element: HTMLAnchorElement;
      onClickFn: ((event: MouseEvent) => void) | null;
    }
  >();

  const Control = L.Control.extend({
    onAdd(_map: L.Map) {
      const containerDiv = L.DomUtil.create('div');
      containerDiv.classList.add(
        'leaflet-control',
        'leaflet-bar',
        'marker-controls'
      );
      for (let buttonConfig of buttonConfigs) {
        const element = createButton(buttonConfig);
        buttonMap.set(buttonConfig.id, {
          element,
          onClickFn: buttonConfig.onClickFn ? buttonConfig.onClickFn : null,
        });
        containerDiv.appendChild(element);
      }
      return containerDiv;
    },
    onRemove(_map: L.Map) {
      // No external resources to clean up
    },
  });

  const control = new Control({ position: 'topleft' });
  map.addControl(control);

  return {
    removeFromMap() {
      map.removeControl(control);
    },
    update(buttonConfigs: ButtonUpdateConfig[]) {
      for (let buttonConfig of buttonConfigs) {
        const button = buttonMap.get(buttonConfig.id);
        if (!(button != null)) {
          throw new Error(
            `Button ID (${buttonConfig.id}) does not exist in map.`
          );
        }

        const { element, onClickFn } = button;

        if (buttonConfig.icon) {
          if (element.lastElementChild) {
            element.removeChild(element.lastElementChild);
          }
          element.appendChild(createIcon(buttonConfig.icon));
        }

        if (buttonConfig.altText) {
          element.setAttribute('title', buttonConfig.altText);
          element.setAttribute('aria-label', buttonConfig.altText);
        }

        if (buttonConfig.onClickFn) {
          if (onClickFn) {
            element.removeEventListener('click', onClickFn);
          }
          element.addEventListener('click', buttonConfig.onClickFn);
          buttonMap.set(buttonConfig.id, {
            element,
            onClickFn: buttonConfig.onClickFn,
          });
        }

        element.classList.remove('button-active');
        element.classList.remove('leaflet-disabled');

        if (buttonConfig.state == 'active') {
          element.classList.add('button-active');
        }

        if (buttonConfig.state == 'disabled') {
          element.classList.add('leaflet-disabled');
        }
      }
    },
  };
}
