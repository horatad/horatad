/**
 * Google Apps Script — sync Google Drive inbox → GitHub
 * วางไฟล์นี้ใน Google Apps Script (script.google.com)
 * ในบัญชี Google Drive private
 *
 * ตั้งค่าก่อนใช้:
 *   1. File → Project properties → Script properties:
 *      GITHUB_TOKEN = ghp_xxxxxxxxxxxx  (PAT ที่มี repo write access)
 *      GITHUB_REPO  = horatad/horatad
 *      INBOX_FOLDER_ID = (ID ของ folder ใน Drive ที่ใช้เป็นถัง)
 *   2. ตั้ง trigger: Triggers → Add trigger → syncToGitHub → Time-driven → Day timer
 */

const GITHUB_API = 'https://api.github.com';

function syncToGitHub() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  const repo  = props.getProperty('GITHUB_REPO');
  const folderId = props.getProperty('INBOX_FOLDER_ID');

  const inboxFolder = DriveApp.getFolderById(folderId);
  let processedFolder;

  // หรือสร้าง /processed subfolder
  const subs = inboxFolder.getFoldersByName('processed');
  processedFolder = subs.hasNext() ? subs.next() : inboxFolder.createFolder('processed');

  const files = inboxFolder.getFiles();
  let pushed = 0;

  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();

    // รองรับ Google Docs และ .txt / .md
    let content = '';
    if (file.getMimeType() === MimeType.GOOGLE_DOCS) {
      content = DocumentApp.openById(file.getId()).getBody().getText();
    } else {
      content = file.getBlob().getDataAsString('UTF-8');
    }

    // สร้าง JSON envelope
    const payload = {
      title: name.replace(/\.[^.]+$/, ''),
      body: content,
      category: 'manual',
      source: 'drive',
      tags: [],
      date_added: new Date().toISOString().slice(0, 10),
      priority_score: 0,
      status: 'inbox'
    };

    const filename = `content/inbox/${new Date().getTime()}_${sanitize(name)}.json`;
    pushFileToGitHub(token, repo, filename, JSON.stringify(payload, null, 2));

    // ย้ายไป processed ไม่ให้ sync ซ้ำ
    file.moveTo(processedFolder);
    pushed++;
  }

  Logger.log(`Pushed ${pushed} files to GitHub`);
}

function pushFileToGitHub(token, repo, path, content) {
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}`;
  const encoded = Utilities.base64Encode(Utilities.newBlob(content, 'application/octet-stream').getBytes());

  const options = {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'HoratadDriveSync/1.0'
    },
    payload: JSON.stringify({
      message: `content: add from Drive — ${path.split('/').pop()}`,
      content: encoded
    }),
    muteHttpExceptions: true
  };

  const res = UrlFetchApp.fetch(url, options);
  if (res.getResponseCode() >= 400) {
    Logger.log(`ERROR pushing ${path}: ${res.getContentText()}`);
  }
}

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9ก-๙\-_.]/g, '_').slice(0, 60);
}
