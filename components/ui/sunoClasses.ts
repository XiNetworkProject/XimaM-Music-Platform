// Shared "Suno-like" UI class atoms (copiés du vocabulaire du snippet `example`)
// But: permettre un rendu cohérent (boutons/inputs/panels) sans dupliquer des chaînes énormes partout.

export const SUNO_BTN_BASE =
  'relative inline-block font-sans font-medium text-center ' +
  'before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:bg-transparent ' +
  'after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 ' +
  'enabled:hover:after:opacity-100 ' +
  'transition duration-75 before:transition before:duration-75 after:transition after:duration-75 ' +
  'select-none';

export const SUNO_PILL_OUTLINE =
  `${SUNO_BTN_BASE} cursor-pointer px-4 py-2 rounded-full ` +
  'text-foreground-primary bg-transparent ' +
  'before:border-border-primary enabled:hover:before:bg-overlay-on-primary ' +
  'disabled:after:bg-background-primary disabled:after:opacity-50 ' +
  'text-xs leading-[24px]';

export const SUNO_PILL_SOLID =
  `${SUNO_BTN_BASE} cursor-pointer px-4 py-2 rounded-full ` +
  'text-foreground-primary bg-background-tertiary ' +
  'enabled:hover:before:bg-overlay-on-primary ' +
  'disabled:after:bg-background-primary disabled:after:opacity-50 ' +
  'text-xs leading-[24px]';

export const SUNO_ICON_PILL =
  `${SUNO_BTN_BASE} cursor-pointer rounded-full aspect-square p-3 ` +
  'text-foreground-primary bg-background-tertiary enabled:hover:before:bg-overlay-on-primary ' +
  'disabled:after:bg-background-primary disabled:after:opacity-50';

export const SUNO_INPUT =
  'w-full bg-transparent outline-none ' +
  'text-foreground-primary placeholder:text-background-fog-dense';

// Field wrapper for inputs/textarea/select to match the snippet "pill/field" surfaces
export const SUNO_FIELD =
  'w-full bg-background-tertiary border border-border-primary rounded-lg px-3 py-2 ' +
  'text-foreground-primary placeholder:text-background-fog-dense outline-none';

export const SUNO_TEXTAREA =
  'w-full bg-background-tertiary border border-border-primary rounded-lg px-3 py-2 ' +
  'text-foreground-primary placeholder:text-background-fog-dense outline-none resize-none';

export const SUNO_SELECT =
  'w-full bg-background-tertiary border border-border-primary rounded-lg px-3 py-2 ' +
  'text-foreground-primary outline-none';

export const SUNO_PANEL =
  'bg-background-primary border border-border-primary rounded-2xl';

export const SUNO_CARD =
  'bg-background-tertiary border border-border-primary rounded-xl';

export const SUNO_DIVIDER = 'bg-border-primary/60';

