use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use tokio::sync::oneshot;

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveSlotMeta {
    pub slot: i32,
    pub label: String,
    pub updated_at: u64,
}

#[tauri::command]
async fn export_save(app: AppHandle, json: String) -> Result<String, String> {
    let (tx, rx) = oneshot::channel();
    app.dialog()
        .file()
        .add_filter("Fractured Alliance Save", &["fasave"])
        .set_file_name("fractured-alliance.fasave")
        .save_file(move |path| {
            let _ = tx.send(path);
        });
    match rx.await.map_err(|e| e.to_string())? {
        Some(p) => {
            let path_buf: PathBuf = p.into();
            std::fs::write(&path_buf, json.as_bytes()).map_err(|e| e.to_string())?;
            Ok(path_buf.to_string_lossy().to_string())
        }
        None => Err("cancelled".to_string()),
    }
}

#[tauri::command]
async fn import_save(app: AppHandle) -> Result<String, String> {
    let (tx, rx) = oneshot::channel();
    app.dialog()
        .file()
        .add_filter("Fractured Alliance Save", &["fasave"])
        .pick_file(move |path| {
            let _ = tx.send(path);
        });
    match rx.await.map_err(|e| e.to_string())? {
        Some(p) => {
            let path_buf: PathBuf = p.into();
            let bytes = std::fs::read(&path_buf).map_err(|e| e.to_string())?;
            String::from_utf8(bytes).map_err(|e| e.to_string())
        }
        None => Err("cancelled".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![export_save, import_save])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
