/**
 * Google Apps Script for uploading attachments
 *
 * SETUP:
 * 1. Open your Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Delete any existing code and paste this entire script
 * 4. Click Save (Ctrl+S)
 * 5. Click Run → Select "onOpen" to initialize the menu
 * 6. Authorize when prompted
 *
 * To get your folder ID:
 * - Open Google Drive
 * - Navigate to your desired folder
 * - Copy the folder ID from the URL (the part after /folders/)
 *
 * MENU ITEMS:
 * - Upload Attachment: Opens dialog to upload images to Drive and create links in cells
 */



/**
 * Menu function to run from the Google Sheets menu
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Airtable Sync')
    .addItem('Upload Attachment', 'showUploadDialog')
    .addToUi();
}

/**
 * Show the upload dialog for attaching files
 */
function showUploadDialog() {
  const html = HtmlService
    .createHtmlOutput(getUploadDialogHtml())
    .setWidth(400)
    .setHeight(300)
    .setTitle('Upload Attachment');

  SpreadsheetApp.getUi().showModalDialog(html, 'Upload Attachment');
}

/**
 * Handle file upload and create link in active cell
 */
function uploadFile(fileData) {
  try {
    // Get the designated folder (you can customize this folder ID)
    // Replace 'YOUR_FOLDER_ID_HERE' with your actual Google Drive folder ID
    const folderId = '1AUeKQ-pvbgbciv5ymQU1-9485ollO08d'; // Attachments folder
    const folder = DriveApp.getFolderById(folderId);

    // Decode the base64 file data
    const decodedData = Utilities.base64Decode(fileData.data);
    const fileBlob = Utilities.newBlob(decodedData, fileData.type, fileData.name);

    // Create file in the designated folder
    const file = folder.createFile(fileBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Create the sharing link
    const fileUrl = file.getUrl();

    // Get the active cell and set the link
    const activeCell = SpreadsheetApp.getActiveSpreadsheet().getActiveCell();
    if (activeCell) {
      // Create a hyperlink formula
      const hyperlinkFormula = `=HYPERLINK("${fileUrl}", "${file.getName()}")`;
      activeCell.setFormula(hyperlinkFormula);
    }

    return {
      success: true,
      message: 'File uploaded successfully!',
      fileName: file.getName(),
      fileUrl: fileUrl
    };

  } catch (error) {
    Logger.log('Upload error: ' + error.message);
    return {
      success: false,
      message: 'Upload failed: ' + error.message
    };
  }
}

/**
 * Get the HTML for the upload dialog
 */
function getUploadDialogHtml() {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .upload-area {
            border: 2px dashed #ccc;
            border-radius: 5px;
            padding: 40px;
            text-align: center;
            margin: 20px 0;
            cursor: pointer;
            transition: border-color 0.3s;
          }
          .upload-area:hover {
            border-color: #999;
          }
          .upload-area.dragover {
            border-color: #007bff;
            background-color: #f8f9fa;
          }
          input[type="file"] {
            display: none;
          }
          .file-info {
            margin: 10px 0;
            font-size: 14px;
            color: #666;
          }
          .buttons {
            text-align: right;
            margin-top: 20px;
          }
          button {
            padding: 8px 16px;
            margin-left: 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .upload-btn { background-color: #007bff; color: white; }
          .cancel-btn { background-color: #6c757d; color: white; }
          .upload-btn:disabled { background-color: #ccc; cursor: not-allowed; }
        </style>
      </head>
      <body>
        <h3>Upload Attachment</h3>
        <p>Select an image file to upload to Google Drive and create a link in the selected cell.</p>

        <div class="upload-area" id="uploadArea">
          <div id="uploadText">Click to select file or drag and drop here</div>
          <input type="file" id="fileInput" accept="image/*">
        </div>

        <div class="file-info" id="fileInfo"></div>

        <div class="buttons">
          <button class="cancel-btn" onclick="google.script.host.close()">Cancel</button>
          <button class="upload-btn" id="uploadBtn" onclick="uploadFile()" disabled>Upload</button>
        </div>

        <script>
          let selectedFile = null;

          const uploadArea = document.getElementById('uploadArea');
          const fileInput = document.getElementById('fileInput');
          const fileInfo = document.getElementById('fileInfo');
          const uploadBtn = document.getElementById('uploadBtn');
          const uploadText = document.getElementById('uploadText');

          // Handle file selection via click
          uploadArea.addEventListener('click', () => {
            fileInput.click();
          });

          // Handle file input change
          fileInput.addEventListener('change', (e) => {
            handleFileSelect(e.target.files[0]);
          });

          // Handle drag and drop
          uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
          });

          uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
          });

          uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
              handleFileSelect(files[0]);
            }
          });

          function handleFileSelect(file) {
            if (file && file.type.startsWith('image/')) {
              selectedFile = file;
              fileInfo.textContent = \`Selected: \${file.name} (\${(file.size / 1024).toFixed(1)} KB)\`;
              uploadBtn.disabled = false;
              uploadText.textContent = 'File selected: ' + file.name;
            } else {
              alert('Please select an image file.');
              selectedFile = null;
              fileInfo.textContent = '';
              uploadBtn.disabled = true;
              uploadText.textContent = 'Click to select file or drag and drop here';
            }
          }

          function uploadFile() {
            if (!selectedFile) return;

            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Uploading...';

            // Convert file to base64 for upload
            const reader = new FileReader();
            reader.onload = function(e) {
              const base64Data = e.target.result.split(',')[1];

              google.script.run
                .withSuccessHandler((result) => {
                  if (result.success) {
                    alert('File uploaded successfully! Link created in selected cell.');
                    google.script.host.close();
                  } else {
                    alert('Upload failed: ' + result.message);
                    uploadBtn.disabled = false;
                    uploadBtn.textContent = 'Upload';
                  }
                })
                .withFailureHandler((error) => {
                  alert('Upload failed: ' + error.message);
                  uploadBtn.disabled = false;
                  uploadBtn.textContent = 'Upload';
                })
                .uploadFile({
                  file: {
                    name: selectedFile.name,
                    type: selectedFile.type,
                    data: base64Data
                  }
                });
            };
            reader.readAsDataURL(selectedFile);
          }
        </script>
      </body>
    </html>
  `;
}

