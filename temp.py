
import re

with open('src/components/studio/SyllableInspectorModal.tsx', 'r') as f:
    content = f.read()

# Replace <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
content = content.replace(
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

# Wrap each <View style={styles.sectionBlock}> in a <View style={{ width: screenWidth }}>
# Be careful: We must find the exact opening and closing tags of the sections.
# Let's just do a regex replace on the <View style={styles.sectionBlock}>
# Wait, this is hard with regex because of nested Views.
# Better to do it manually using replace if they are all identical.

# Instead of regex, I'll just find the line numbers using grep and insert.

