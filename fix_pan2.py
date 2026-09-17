
import re
with open('src/components/studio/paper/CadencePaperStudio.tsx', 'r') as f:
    text = f.read()

pattern = r'const sidebarPanResponder = useRef\(\s*PanResponder\.create\(\{.*?\}\)\s*\)\.current;'
replacement = '''const sidebarPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gs) => {
        const isEdgeSwipe = gs.x0 < 45 && gs.dx > 5;
        const isClosing = sidebarOpen && gs.dx < -5;
        return isEdgeSwipe || isClosing;
      },
      onPanResponderMove: (evt, gs) => {
        let newX = (sidebarOpen ? 0 : -SIDEBAR_WIDTH) + gs.dx;
        if (newX > 0) newX = 0;
        if (newX < -SIDEBAR_WIDTH) newX = -SIDEBAR_WIDTH;
        sidebarPanX.setValue(newX);
      },
      onPanResponderRelease: (evt, gs) => {
        let newOpen = sidebarOpen;
        if (sidebarOpen && gs.dx < -50) newOpen = false;
        if (!sidebarOpen && gs.dx > 50) newOpen = true;
        if (Math.abs(gs.vx) > 0.5) {
          newOpen = gs.vx > 0;
        }

        setSidebarOpen(newOpen);
        Animated.spring(sidebarPanX, {
          toValue: newOpen ? 0 : -SIDEBAR_WIDTH,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;'''

text = re.sub(pattern, replacement, text, flags=re.DOTALL)

with open('src/components/studio/paper/CadencePaperStudio.tsx', 'w') as f:
    f.write(text)

