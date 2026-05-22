import zipfile, re, sys
path = sys.argv[1]
with zipfile.ZipFile(path) as z:
    with z.open('word/document.xml') as f:
        content = f.read().decode('utf-8')
text = re.sub(r'<[^>]+>', '', content)
text = re.sub(r'\s+', ' ', text).strip()
print(text)
