
with open('src/components/studio/paper/CadencePaperStudio.tsx', 'r') as f:
    text = f.read()

# Add a ref to track sidebarOpen
text = text.replace(
    'const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);',
    'const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);\\n  const sidebarOpenRef = useRef(false);\\n  useEffect(() => { sidebarOpenRef.current = sidebarOpen; }, [sidebarOpen]);'
)

# Use the ref in the pan responder
text = text.replace(
    'const isClosing = sidebarOpen && gs.dx < -5;',
    'const isClosing = sidebarOpenRef.current && gs.dx < -5;'
)

text = text.replace(
    'let newX = (sidebarOpen ? 0 : -SIDEBAR_WIDTH) + gs.dx;',
    'let newX = (sidebarOpenRef.current ? 0 : -SIDEBAR_WIDTH) + gs.dx;'
)

text = text.replace(
    'let newOpen = sidebarOpen;',
    'let newOpen = sidebarOpenRef.current;'
)

text = text.replace(
    'if (sidebarOpen && gs.dx < -50) newOpen = false;\\n        if (!sidebarOpen && gs.dx > 50) newOpen = true;',
    'if (sidebarOpenRef.current && gs.dx < -50) newOpen = false;\\n        if (!sidebarOpenRef.current && gs.dx > 50) newOpen = true;'
)

with open('src/components/studio/paper/CadencePaperStudio.tsx', 'w') as f:
    f.write(text)

