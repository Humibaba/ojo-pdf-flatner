import io
import os
import random
import numpy as np
from flask import Flask, render_template, request, send_file
import pymupdf as fitz  # עודכן לפי הדרישה
from PIL import Image

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

def add_anti_ocr_noise(img):
    """מוסיף שכבת רעש סטטי עדינה וסיבוב מיקרוסקופי כמעט בלתי מורגש"""
    # 1. סיבוב עדין במיוחד (בין 0.1 ל-0.3 מעלות בלבד)
    angle = random.choice([-0.3, -0.2, -0.1, 0.1, 0.2, 0.3])
    img = img.rotate(angle, expand=False, fillcolor=(255, 255, 255))
    
    # 2. יצירת רעש סטטי בעזרת NumPy
    img_np = np.array(img).astype(np.float32)
    
    # עוצמת רעש עדינה (~5%)
    noise_intensity = 13.0 
    noise = np.random.normal(0, noise_intensity, img_np.shape)
    
    # השלכת הרעש על התמונה וחיתוך ערכים חורגים (0-255)
    noisy_img_np = np.clip(img_np + noise, 0, 255).astype(np.uint8)
    
    return Image.fromarray(noisy_img_np)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/flatten', methods=['POST'])
def flatten():
    if 'pdf_file' not in request.files:
        return 'לא נבחר קובץ', 400
    
    file = request.files['pdf_file']
    if file.filename == '':
        return 'לא נבחר קובץ', 400

    try:
        doc = fitz.open(stream=file.read(), filetype="pdf")
        images = []

        for page in doc:
            pix = page.get_pixmap(dpi=120)
            img_bytes = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_bytes))
            
            if img.mode != 'RGB':
                img = img.convert('RGB')
                
            protected_img = add_anti_ocr_noise(img)
            images.append(protected_img)

        output_pdf = io.BytesIO()
        if images:
            images[0].save(
                output_pdf,
                format='PDF',
                save_all=True,
                append_images=images[1:]
            )
            output_pdf.seek(0)
            
            original_name = os.path.splitext(file.filename)[0]
            output_filename = f"{original_name}_protected.pdf"

            return send_file(
                output_pdf,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=output_filename
            )

        return 'הקובץ ריק', 400

    except Exception as e:
        return f'שגיאה בעיבוד: {str(e)}', 500

if __name__ == '__main__':
    app.run(debug=True)