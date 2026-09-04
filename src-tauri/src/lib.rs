use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
pub struct OAuthPayload {
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub code: Option<String>,
    pub error: Option<String>,
}

static SERVER_RUNNING: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn open_browser(url: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn start_oauth_server(app_handle: AppHandle) -> Result<(), String> {
    if SERVER_RUNNING.swap(true, Ordering::SeqCst) {
        // Server already listening or active
        return Ok(());
    }

    let handle = app_handle.clone();
    thread::spawn(move || {
        let listener = match TcpListener::bind("127.0.0.1:38291") {
            Ok(l) => l,
            Err(e) => {
                log::warn!("Could not bind OAuth listener on 127.0.0.1:38291: {}", e);
                SERVER_RUNNING.store(false, Ordering::SeqCst);
                return;
            }
        };

        let _ = listener.set_nonblocking(true);
        let start_time = std::time::Instant::now();
        let max_duration = Duration::from_secs(120);

        let success_html = r#"<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Finante - Autenticação</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #1c1c1e;
      color: #ffffff;
    }
    .card {
      background: #2c2c2e;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 36px 44px;
      text-align: center;
      max-width: 420px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .icon { font-size: 40px; margin-bottom: 12px; }
    h2 { margin: 0 0 10px 0; color: #3584e4; font-size: 22px; }
    p { color: #a1a1a6; font-size: 15px; margin: 0 0 16px 0; line-height: 1.4; }
    .hint { font-size: 12px; color: #787880; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✨</div>
    <h2>Autenticação Concluída</h2>
    <p>Sua conta foi conectada com sucesso ao <strong>Finante</strong>.</p>
    <div class="hint">Você já pode fechar esta janela e voltar ao aplicativo.</div>
  </div>
  <script>
    const hash = window.location.hash.substring(1);
    const search = window.location.search.substring(1);
    const params = new URLSearchParams(hash || search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const code = params.get('code');
    const error = params.get('error_description') || params.get('error');

    fetch('/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        code: code,
        error: error
      })
    }).then(() => {
      setTimeout(() => {
        window.open('', '_self', '');
        window.close();
      }, 1200);
    }).catch(console.error);
  </script>
</body>
</html>"#;

        while start_time.elapsed() < max_duration {
            match listener.accept() {
                Ok((mut stream, _addr)) => {
                    let mut buffer = [0; 4096];
                    let _ = stream.set_read_timeout(Some(Duration::from_secs(3)));
                    if let Ok(bytes_read) = stream.read(&mut buffer) {
                        let request = String::from_utf8_lossy(&buffer[..bytes_read]);

                        if request.starts_with("OPTIONS") {
                            let response = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\nConnection: close\r\n\r\n";
                            let _ = stream.write_all(response.as_bytes());
                            let _ = stream.flush();
                        } else if request.starts_with("GET /favicon.ico") {
                            let response = "HTTP/1.1 204 No Content\r\nConnection: close\r\n\r\n";
                            let _ = stream.write_all(response.as_bytes());
                            let _ = stream.flush();
                        } else if request.starts_with("GET") {
                            let response = format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{}",
                                success_html.as_bytes().len(),
                                success_html
                            );
                            let _ = stream.write_all(response.as_bytes());
                            let _ = stream.flush();
                        } else if request.starts_with("POST") {
                            let body = if let Some(pos) = request.find("\r\n\r\n") {
                                &request[pos + 4..]
                            } else {
                                ""
                            };

                            let payload: Result<OAuthPayload, _> = serde_json::from_str(body);
                            if let Ok(oauth_data) = payload {
                                let _ = handle.emit("oauth-callback", oauth_data);
                            }

                            let response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n{\"status\":\"ok\"}";
                            let _ = stream.write_all(response.as_bytes());
                            let _ = stream.flush();

                            break;
                        }
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(50));
                }
                Err(_) => {
                    thread::sleep(Duration::from_millis(50));
                }
            }
        }

        SERVER_RUNNING.store(false, Ordering::SeqCst);
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![open_browser, start_oauth_server])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
