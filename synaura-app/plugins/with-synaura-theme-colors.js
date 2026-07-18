const fs = require('fs');
const path = require('path');
const { withAndroidColors, withDangerousMod } = require('@expo/config-plugins');

const LIGHT_COLORS = {
  synaura_background: '#F7F6F3',
  synaura_background_alt: '#EFEEE9',
  synaura_surface: '#FFFFFF',
  synaura_surface_strong: '#F1EFEA',
  synaura_surface_muted: '#E7E4DE',
  synaura_elevated_surface: '#FFFFFF',
  synaura_border: '#16111111',
  synaura_border_strong: '#2B111111',
  synaura_text: '#111111',
  synaura_text_secondary: '#AD111111',
  synaura_text_tertiary: '#73111111',
  synaura_glass_light: '#F5FFFFFF',
  synaura_glass_dark: '#F5F7F6F3',
};

const DARK_COLORS = {
  synaura_background: '#0D0D0D',
  synaura_background_alt: '#080909',
  synaura_surface: '#151515',
  synaura_surface_strong: '#1C1C1C',
  synaura_surface_muted: '#242424',
  synaura_elevated_surface: '#202020',
  synaura_border: '#14F7F6F3',
  synaura_border_strong: '#29F7F6F3',
  synaura_text: '#F7F6F3',
  synaura_text_secondary: '#ADF7F6F3',
  synaura_text_tertiary: '#70F7F6F3',
  synaura_glass_light: '#F5151515',
  synaura_glass_dark: '#F00D0D0D',
};

function upsertColors(resources, values) {
  const names = new Set(Object.keys(values));
  const existing = Array.isArray(resources.color) ? resources.color.filter((item) => !names.has(item?.$?.name)) : [];
  resources.color = [
    ...existing,
    ...Object.entries(values).map(([name, value]) => ({ $: { name }, _: value })),
  ];
}

function nightColorsXml() {
  const rows = Object.entries(DARK_COLORS).map(([name, value]) => `  <color name="${name}">${value}</color>`);
  return `<resources>\n${rows.join('\n')}\n</resources>\n`;
}

module.exports = function withSynauraThemeColors(config) {
  config = withAndroidColors(config, (androidConfig) => {
    upsertColors(androidConfig.modResults.resources, LIGHT_COLORS);
    return androidConfig;
  });

  return withDangerousMod(config, ['android', async (androidConfig) => {
    const directory = path.join(androidConfig.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'values-night');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'colors.xml'), nightColorsXml(), 'utf8');
    return androidConfig;
  }]);
};
