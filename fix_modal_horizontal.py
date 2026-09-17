
with open('src/components/studio/SyllableInspectorModal.tsx', 'r') as f:
    text = f.read()

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

text = text.replace(
    '{/* Step 1: Annunciation & Delivery Variants (Ranked by Surrounding Rhyme Syllables) */}',
    '<View style={{ width: screenWidth, paddingHorizontal: 16 }}>\\n              {/* Step 1: Annunciation & Delivery Variants (Ranked by Surrounding Rhyme Syllables) */}'
)
text = text.replace(
    '{/* Step 2: Individual Manual Syllable Selector */}',
    '</View>\\n\\n            <View style={{ width: screenWidth, paddingHorizontal: 16 }}>\\n              {/* Step 2: Individual Manual Syllable Selector */}'
)
text = text.replace(
    '{/* Step 3: Metric Stress Placement */}',
    '</View>\\n\\n            <View style={{ width: screenWidth, paddingHorizontal: 16 }}>\\n              {/* Step 3: Metric Stress Placement */}'
)
text = text.replace(
    '{/* Step 4: 16-Step Bar Grid Alignment */}',
    '</View>\\n\\n            <View style={{ width: screenWidth, paddingHorizontal: 16 }}>\\n              {/* Step 4: 16-Step Bar Grid Alignment */}'
)
text = text.replace(
    '{/* Step 5: 12+ Perceptual Sonic Rhyme Families */}',
    '</View>\\n\\n            <View style={{ width: screenWidth, paddingHorizontal: 16 }}>\\n              {/* Step 5: 12+ Perceptual Sonic Rhyme Families */}'
)

pagination = '''            </View>
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

text = text.replace('          </ScrollView>\\n        </Animated.View>', pagination)

text = text.replace(
    '  scrollContent: {\\n    paddingHorizontal: 20,\\n    paddingVertical: 16,\\n  },',
    '  scrollContent: {\\n    paddingVertical: 16,\\n  },'
)

# Replace the LAST }); in the file to insert styles.
# Find the last '});'
last_index = text.rfind('});')
if last_index != -1:
    styles_str = '''  paginationContainer: {
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
});'''
    text = text[:last_index] + styles_str + text[last_index+3:]

with open('src/components/studio/SyllableInspectorModal.tsx', 'w') as f:
    f.write(text)

