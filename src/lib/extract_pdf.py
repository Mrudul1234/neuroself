import sys
import json
import base64
import os

try:
    import fitz # PyMuPDF
except ImportError:
    print(json.dumps({"error": "PyMuPDF (fitz) is not installed in the python environment."}))
    sys.exit(1)

def clean_text(text):
    return text.replace("\n", " ").strip()

def process_pdf(pdf_path):
    if not os.path.exists(pdf_path):
        return {"error": f"File not found: {pdf_path}"}

    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        return {"error": f"Failed to open PDF: {str(e)}"}

    pages_data = []
    full_text_parts = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # 1. TEXT EXTRACTION (using PyMuPDF blocks for smart paragraph structure)
        # page.get_text("blocks") returns a list of tuples: (x0, y0, x1, y1, "text", block_no, block_type)
        blocks = page.get_text("blocks")
        # Sort blocks top-to-bottom, then left-to-right
        blocks.sort(key=lambda b: (b[1], b[0]))
        
        text_html = ""
        page_text_parts = []
        
        for block in blocks:
            block_text = block[4].strip()
            if not block_text:
                continue
            
            page_text_parts.append(block_text)
            
            # Simple heuristic for headings: short block, bold-like or capitalised
            is_heading = len(block_text) < 90 and (block_text.isupper() or block_text.startswith(tuple("0123456789")))
            
            # Clean paragraphs (replace single newlines within the paragraph with spaces)
            cleaned_paragraph = block_text.replace("\n", " ")
            
            if is_heading:
                text_html += f'<h2 class="font-instrument italic text-[24px] md:text-[30px] font-bold mt-8 mb-4 tracking-tight leading-tight">{cleaned_paragraph}</h2>\n'
            else:
                text_html += f'<p class="mb-5 leading-relaxed text-justify opacity-95">{cleaned_paragraph}</p>\n'

        page_full_text = "\n\n".join(page_text_parts)
        full_text_parts.append(page_full_text)

        # 2. IMAGE EXTRACTION
        images = []
        try:
            image_list = page.get_images(full=True)
            for img_info in image_list:
                xref = img_info[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                
                # Limit very large images to prevent massive JSON payloads (resize if extremely huge, but usually base64 is fine)
                # Convert to base64
                encoded = base64.b64encode(image_bytes).decode("utf-8")
                images.append(f"data:image/{image_ext};base64,{encoded}")
        except Exception as img_err:
            # Silently log/skip image extraction errors for a specific image
            pass

        pages_data.append({
            "pageNum": page_num + 1,
            "textHTML": text_html,
            "images": images
        })

    doc.close()

    return {
        "fullText": "\n\n".join(full_text_parts),
        "pages": pages_data
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No PDF path provided."}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    result = process_pdf(pdf_path)
    print(json.dumps(result))
