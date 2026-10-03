import { VIEWS, VIEW_IDS } from '../scene/views';
import { t } from '../i18n';

/*
 * The 3D view's menu items (`StageOptions`), shared by the toolpath and the
 * height map's preview: the four views and the layers, each with its glyph.
 */

// Which glyph stands for which layer. The ids come from the widget; this is
// the one place that knows what they look like.
const LAYER_ICONS = {
  path: 'path',
  programArea: 'area',
  wcsAxes: 'axes',
  machineArea: 'machine',
  machineAxes: 'machineAxes',
  map: 'map',
};

// `free` is "the camera has been moved by hand since the last view button".
// The button is still a destination and still works; it just stops claiming
// to describe where the camera is.
export const viewItems = (view, onView, free) => VIEW_IDS.map((id) => ({
  id,
  icon: id,
  label: t(VIEWS[id].labelKey),
  pressed: !free && id === view,
  onSelect: () => onView(id),
}));

export const layerItems = (sections, layers, onLayers) => sections.flatMap(
  (section) => section.options.map((option) => ({
    id: option.id,
    icon: LAYER_ICONS[option.id],
    label: t('stage.item', { section: section.label, option: option.label }),
    note: option.disabled ? option.note : '',
    pressed: Boolean(layers[option.id]) && !option.disabled,
    disabled: option.disabled,
    onSelect: () => onLayers({ ...layers, [option.id]: !layers[option.id] }),
  }))
);
