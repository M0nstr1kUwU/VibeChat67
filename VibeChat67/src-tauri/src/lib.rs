use tauri_plugin_sql::{Migration, MigrationKind};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

#[tauri::command]
fn save_attachment(source_path: String) -> Result<String, String> {
    let source = Path::new(&source_path);

    if !source.exists() {
        return Err(format!("Файл не найден: {}", source_path));
    }

    let attachments_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("attachments");

    fs::create_dir_all(&attachments_dir)
        .map_err(|e| format!("Не удалось создать attachments: {e}"))?;

    let extension = source
        .extension()
        .and_then(|x| x.to_str())
        .unwrap_or("png");

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    let filename = format!("image_{}.{}", timestamp, extension);

    let destination = attachments_dir.join(filename);

    fs::copy(source, &destination)
        .map_err(|e| format!("Не удалось скопировать файл: {e}"))?;

    Ok(destination.to_string_lossy().to_string())
}

#[tauri::command]
fn get_recent_attachments() -> Result<Vec<String>, String> {
    let attachments_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("attachments");

    fs::create_dir_all(&attachments_dir)
        .map_err(|e| format!("Не удалось создать attachments: {e}"))?;

    let mut files: Vec<(PathBuf, SystemTime)> = Vec::new();

    let entries = fs::read_dir(&attachments_dir)
        .map_err(|e| format!("Не удалось прочитать attachments: {e}"))?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        let is_image = path
            .extension()
            .and_then(|x| x.to_str())
            .map(|x| {
                matches!(
                    x.to_lowercase().as_str(),
                    "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp"
                )
            })
            .unwrap_or(false);

        if !is_image {
            continue;
        }

        let modified = entry
            .metadata()
            .and_then(|x| x.modified())
            .unwrap_or(UNIX_EPOCH);

        files.push((path, modified));
    }

    // Новые сверху
    files.sort_by(|a, b| b.1.cmp(&a.1));

    // Только 20 последних
    files.truncate(20);

    Ok(files
        .into_iter()
        .map(|(path, _)| path.to_string_lossy().to_string())
        .collect())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]

pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_message_table",
        sql: include_str!("../migrations/0001_initial.sql"),
        kind: MigrationKind::Up,
    }];

    // Сборщик приложения
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                // Связываем миграции с sql базой
                .add_migrations("sqlite:messenger.db", migrations)
                .build(),
        )
        // Создаём плагин opener из стандартного шаблона tauri
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            save_attachment,
            get_recent_attachments
        ])
        .run(tauri::generate_context!())
        .expect("Ало да, тут сломалось крч...")
}
