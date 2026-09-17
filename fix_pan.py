
with open('src/components/studio/paper/CadencePaperStudio.tsx', 'r') as f:
    text = f.read()

replacement = '''      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (evt, gs) => {
          const isEdgeSwipe = gs.x0 < 45 && gs.dx > 5;
          const isClosing = sidebarOpen && gs.dx < -5;
          return isEdgeSwipe || isClosing;
        },'''

text = text.replace('''      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          const isEdge = evt.nativeEvent.pageX < 30;
          return isEdge;
        },
        onMoveShouldSetPanResponder: (evt, gs) => {
          const isEdgeSwipe = evt.nativeEvent.pageX < 40 && gs.dx > 5;
          const isClosing = sidebarOpen && gs.dx < -5;
          return isEdgeSwipe || isClosing;
        },''', replacement)

with open('src/components/studio/paper/CadencePaperStudio.tsx', 'w') as f:
    f.write(text)

