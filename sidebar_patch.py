
with open('src/components/studio/paper/CadencePaperStudio.tsx', 'r') as f:
    text = f.read()

gesture_logic = '''
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const screenWidth = Dimensions.get('window').width;
  const SIDEBAR_WIDTH = Math.min(280, screenWidth * 0.85);
  const sidebarPanX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  const sidebarPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const isEdge = evt.nativeEvent.pageX < 30;
        return isEdge;
      },
      onMoveShouldSetPanResponder: (evt, gs) => {
        const isEdgeSwipe = evt.nativeEvent.pageX < 40 && gs.dx > 5;
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
  ).current;

  useEffect(() => {
    Animated.spring(sidebarPanX, {
      toValue: sidebarOpen ? 0 : -SIDEBAR_WIDTH,
      useNativeDriver: false,
    }).start();
  }, [sidebarOpen]);
'''

text = text.replace('  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);', gesture_logic)

# Attach panHandlers to root container. Wait, if I attach to root container, it intercepts EVERYTHING!
# ScrollView inside will break if the root intercepts onMoveShouldSetPanResponder.
# I should attach it to an overlay or a container that wraps the screen.
# If I attach to root view <View style={styles.container}>, onMoveShouldSetPanResponder only claims the gesture if it returns true.
# My logic returns true ONLY if isEdgeSwipe or isClosing. 
# If isClosing, it means sidebarOpen is true. If sidebarOpen is true, we want to intercept.
# If isEdgeSwipe, we are < 40px from edge. ScrollView vertical scrolling will have dx ~ 0, so it won't match gs.dx > 5.
# This is safe.

text = text.replace(
    '<View style={styles.container}>',
    '<View style={styles.container} {...sidebarPanResponder.panHandlers}>'
)

with open('src/components/studio/paper/CadencePaperStudio.tsx', 'w') as f:
    f.write(text)

