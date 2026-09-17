
import sys

with open('src/components/studio/SyllableInspectorModal.tsx', 'r') as f:
    text = f.read()

# 1. Update ScrollView
text = text.replace(
    '<ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>',
    '''<ScrollView 
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

# 2. Add dot pagination at the end of ScrollView
pagination_code = '''
          <View style={styles.paginationContainer}>
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
        </Animated.View>
'''
text = text.replace(
    '</ScrollView>\n          </Animated.View>',
    '</ScrollView>\n' + pagination_code
)

# 3. Step 1 wrap
text = text.replace(
    '{/* Step 1: Annunciation & Delivery Variants (Ranked by Surrounding Rhyme Syllables) */}',
    '<View style={{ width: screenWidth, paddingHorizontal: 16 }}>\n              {/* Step 1: Annunciation & Delivery Variants (Ranked by Surrounding Rhyme Syllables) */}'
)
# We need to find where Step 1 ends and close the View. Step 1 ends right before Step 2.
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

# Step 5 ends with the Reset Button. 
# Right before </ScrollView>
text = text.replace(
    '          </ScrollView>',
    '            </View>\n          </ScrollView>'
)

with open('src/components/studio/SyllableInspectorModal.tsx', 'w') as f:
    f.write(text)

