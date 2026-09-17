
with open('src/components/studio/paper/CadencePaperStudio.tsx', 'r') as f:
    text = f.read()

text = text.replace(
    '<AffineSidebar\\n          isOpen={sidebarOpen}',
    '<AffineSidebar\\n          panX={sidebarPanX}\\n          isOpen={sidebarOpen}'
)

with open('src/components/studio/paper/CadencePaperStudio.tsx', 'w') as f:
    f.write(text)

