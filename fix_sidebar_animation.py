
with open('src/components/studio/affine/AffineSidebar.tsx', 'r') as f:
    text = f.read()

text = text.replace(
    'interface AffineSidebarProps {',
    '''import { Animated } from 'react-native';\n\ninterface AffineSidebarProps {\n  panX?: Animated.Value;'''
)

text = text.replace(
    'onOpenLexicon,\n}) => {',
    'onOpenLexicon,\n  panX,\n}) => {'
)

text = text.replace(
    '<View style={styles.sidebarContainer}>',
    '<Animated.View style={[styles.sidebarContainer, panX && { transform: [{ translateX: panX }] }]}>'
)

text = text.replace(
    '</View>\n  );\n\n  // On Mobile / Web overlay rendering',
    '</Animated.View>\n  );\n\n  // On Mobile / Web overlay rendering'
)

with open('src/components/studio/affine/AffineSidebar.tsx', 'w') as f:
    f.write(text)

