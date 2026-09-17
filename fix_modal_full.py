
with open('src/components/studio/SyllableInspectorModal.tsx', 'r') as f:
    text = f.read()

# 1. Imports
text = text.replace(
    '  View,\n} from \\'react-native\\';',
    '  View,\n  PanResponder,\n  useWindowDimensions,\n} from \\'react-native\\';'
)

# 2. Add Variables
text = text.replace(
    '  const animValue = useRef(new Animated.Value(0)).current;',
    '''  const animValue = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = useWindowDimensions();
  const [activeSlide, setActiveSlide] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: Animated.event([null, { dy: panY }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 120 || gs.vy > 1.5) {
          Animated.timing(panY, {
            toValue: 800,
            duration: 200,
            useNativeDriver: false,
          }).start(onClose);
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const scrollViewRef = useRef<any>(null);

  const dotsPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handleDotsPan(evt),
      onPanResponderMove: (evt) => handleDotsPan(evt),
    })
  ).current;

  const handleDotsPan = (evt: any) => {
    const pageX = evt.nativeEvent.pageX;
    const center = screenWidth / 2;
    const dotSpacing = 16;
    const totalWidth = 5 * dotSpacing;
    const startX = center - totalWidth / 2;
    
    let index = Math.floor((pageX - startX) / dotSpacing);
    if (index < 0) index = 0;
    if (index > 4) index = 4;
    
    if (index !== activeSlide) {
      setActiveSlide(index);
      scrollViewRef.current?.scrollTo({ x: index * screenWidth, animated: false });
    }
  };'''
)

# 3. reset in useEffect
text = text.replace(
    'if (visible) {',
    'if (visible) {\n      panY.setValue(0);\n      setActiveSlide(0);'
)

# 4. Animated.View transform
text = text.replace(
    '<Animated.View\n            style={[\n              styles.sheetContainer,\n              {\n                transform: [\n                  { translateY: sheetTranslateY },',
    '<Animated.View\n            {...panResponder.panHandlers}\n            style={[\n              styles.sheetContainer,\n              {\n                transform: [\n                  { translateY: Animated.add(sheetTranslateY, panY) },'
)

# 5. ScrollView Horizontal
text = text.replace(
    '<ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>',
    '''<ScrollView 
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const slide = Math.round(x / screenWidth);
              if (slide !== activeSlide) setActiveSlide(slide);
            }}
            scrollEventThrottle={16}
            style={styles.scrollContent}
          >'''
)

# 6. Step Wrappers
text = text.replace(
    '{/* Step 1: Annunciation & Delivery Variants (Ranked by Surrounding Rhyme Syllables) */}',
    '<View style={{ width: screenWidth, paddingHorizontal: 16 }}>\n              {/* Step 1: Annunciation & Delivery Variants (Ranked by Surrounding Rhyme Syllables) */}'
)
text = text.replace(
    '{/* Step 2: Individual Manual Syllable Selector */}',
    '</View>\n\n            <View style={{ width: screenWidth, paddingHorizontal: 16 }}>\n              {/* Step 2: Individual Manual Syllable Selector */}'
)
text = text.replace(
    '{/* Step 3: Metric Stress Placement */}',
    '</View>\n\n            <View style={{ width: screenWidth, paddingHorizontal: 16 }}>\n              {/* Step 3: Metric Stress Placement */}'
)
text = text.replace(
    '{/* Step 4: 16-Step Bar Grid Alignment */}',
    '</View>\n\n            <View style={{ width: screenWidth, paddingHorizontal: 16 }}>\n              {/* Step 4: 16-Step Bar Grid Alignment */}'
)
text = text.replace(
    '{/* Step 5: 12+ Perceptual Sonic Rhyme Families */}',
    '</View>\n\n            <View style={{ width: screenWidth, paddingHorizontal: 16 }}>\n              {/* Step 5: 12+ Perceptual Sonic Rhyme Families */}'
)
text = text.replace(
    '</ScrollView>\n          </Animated.View>',
    '''</View>
          </ScrollView>
          <View style={styles.paginationContainer} {...dotsPanResponder.panHandlers}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View 
                key={i} 
                style={[
                  styles.paginationDot, 
                  activeSlide === i && styles.paginationDotActive
                ]} 
              />
            ))}
          </View>
          </Animated.View>'''
)

# 7. Add Styles at the end
# instead of text.replace('});', ...), we just slice the last 4 characters ('});\n') and append.
text = text[:-4] + '''  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    transform: [{ scale: 1.2 }],
  },
});
'''

# 8. Fix ScrollContent padding
text = text.replace(
    '  scrollContent: {\n    paddingHorizontal: 20,\n    paddingVertical: 16,\n  },',
    '  scrollContent: {\n    paddingVertical: 16,\n  },'
)

with open('src/components/studio/SyllableInspectorModal.tsx', 'w') as f:
    f.write(text)

