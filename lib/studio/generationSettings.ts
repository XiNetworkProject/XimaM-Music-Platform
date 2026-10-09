/** Private library folder, not a shared workspace ID or a provider parameter. */
export function validGenerationFolder(value: unknown): boolean {
  return value == null || (typeof value === 'string' && value.length <= 80 && !/[\u0000-\u001f\u007f]/.test(value));
}
export function initialGenerationFolder(metadata: unknown, existing: boolean): Record<string, string> {
  if (existing || !metadata || typeof metadata !== 'object') return {};
  const folder = (metadata as { libraryFolder?: unknown }).libraryFolder;
  return validGenerationFolder(folder) && typeof folder === 'string' && folder.trim() ? { library_folder: folder.trim() } : {};
}
