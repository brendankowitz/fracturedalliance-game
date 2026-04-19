import { invoke } from "@tauri-apps/api/core";

export async function exportSave(json: string): Promise<string> {
  return invoke<string>("export_save", { json });
}

export async function importSave(): Promise<string> {
  return invoke<string>("import_save");
}
