const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('pdf_file');
const fileNameDisplay = document.querySelector('.file-name');
const dropZoneText = document.querySelector('.drop-zone-text');
const submitBtn = document.getElementById('submit-btn');
const form = document.getElementById('upload-form');
const statusBox = document.getElementById('status');
const statusText = document.getElementById('status-text');

// פתיחת חלון בחירת קובץ בלחיצה על אזור הגרירה
dropZone.addEventListener('click', () => fileInput.click());

// שינוי עיצוב בשיגור/גרירה
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    }, false);
});

// טיפול בשחרור קובץ באזור הגרירה
dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        fileInput.files = files;
        updateFileDisplay(files[0].name);
    }
});

// טיפול בבחירת קובץ רגילה
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        updateFileDisplay(fileInput.files[0].name);
    }
});

function updateFileDisplay(name) {
    dropZoneText.classList.add('hidden');
    fileNameDisplay.innerText = "קובץ שנבחר: " + name;
    fileNameDisplay.classList.remove('hidden');
    submitBtn.disabled = false;
    statusBox.classList.add('hidden');
}

// שילוח הטופס ושמירת הקובץ בחזרה
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    submitBtn.disabled = true;
    statusBox.className = 'status-box loading';
    statusText.innerText = 'מרדד את הקובץ... זה עשוי לקחת כמה שניות';
    statusBox.classList.remove('hidden');

    const formData = new FormData(form);

    try {
        const response = await fetch('/flatten', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'שגיאה בעיבוד הקובץ');
        }

        // הורדת הקובץ המרודד
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        
        // חילוץ שם הקובץ מהתגובה או מחדל
        const originalName = fileInput.files[0].name.replace('.pdf', '');
        a.download = `${originalName}_flattened.pdf`;
        
        document.body.appendChild(a);
        a.click();
        a.remove();

        statusBox.classList.add('hidden');
        submitBtn.disabled = false;

    } catch (err) {
        statusBox.className = 'status-box error';
        statusText.innerText = err.message;
        submitBtn.disabled = false;
    }
});