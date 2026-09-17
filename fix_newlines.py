
with open('src/components/studio/SyllableInspectorModal.tsx', 'r') as f:
    text = f.read()

text = text.replace('\\\\n', '\\n')

with open('src/components/studio/SyllableInspectorModal.tsx', 'w') as f:
    f.write(text)

